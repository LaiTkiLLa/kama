import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { FbsStockPublisher, FbsStockPushItem } from './fbs-stock-publisher.interface';

@Injectable()
export class WbFbsStockPublisher implements FbsStockPublisher {
  readonly marketplaceTitle = 'WB';
  private readonly logger = new Logger(WbFbsStockPublisher.name);

  constructor(private configService: ConfigService) {}

  async push(warehouseInternalNumber: string, stocks: FbsStockPushItem[]): Promise<void> {
    const apiToken = this.configService.get<string>('wbToken');
    if (!apiToken) {
      this.logger.error('wbToken не задан — пропуск пуша остатков WB');
      return;
    }
    if (!stocks.length) {
      return;
    }

    const url = `https://marketplace-api.wildberries.ru/api/v3/stocks/${warehouseInternalNumber}`;
    const chunkSize = 1000;
    for (let i = 0; i < stocks.length; i += chunkSize) {
      const chunk = stocks.slice(i, i + chunkSize).map(s => ({
        sku: s.sku,
        amount: s.amount
      }));
      try {
        await axios.put(
          url,
          { stocks: chunk },
          {
            headers: { Authorization: apiToken }
          }
        );
      } catch (error) {
        if (error instanceof AxiosError) {
          this.logger.error(
            `WB stocks PUT warehouse=${warehouseInternalNumber} status=${error.response?.status}`
          );
          this.logger.error(error.response?.data);
        }
        throw error;
      }
    }
  }
}
