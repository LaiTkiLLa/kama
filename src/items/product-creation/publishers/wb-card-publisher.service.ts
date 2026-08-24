import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ProductCreationRequests } from '../../entities/product-creation-requests.entity';
import {
  CreateItemWb,
  GenerateBarcodesResponse,
  WbCardsUploadBody
} from '../../interfaces/create-item-wb.interface';
import { MarketplaceCardPublisher } from './marketplace-card-publisher.interface';

@Injectable()
export class WbCardPublisher implements MarketplaceCardPublisher {
  readonly marketplaceTitle = 'WB';
  private readonly logger = new Logger(WbCardPublisher.name);

  constructor(private configService: ConfigService) {}

  async publish(requests: ProductCreationRequests[]): Promise<void> {
    const cards = requests.map(request => this.parsePayload(request));
    await this.uploadCards(cards);
  }

  private async uploadCards(cards: CreateItemWb[]) {
    if (!cards.length) {
      return;
    }
    const apiToken = this.configService.get<string>('wbToken');
    if (!apiToken) {
      throw new Error('WB token не передан');
    }
    const generateBarcodesUrl = 'https://content-api.wildberries.ru/content/v2/barcodes';
    const { data: barcodes }: { data: GenerateBarcodesResponse } = await axios.post(
      generateBarcodesUrl,
      {
        count: cards.length
      },
      {
        headers: {
          Authorization: apiToken
        }
      }
    );

    const result: { article: string; skus: string }[] = [];

    for (const card of cards) {
      card.variants.forEach(variant => {
        variant.sizes[0].skus.push(barcodes.data[0]);
        result.push({ article: variant.vendorCode, skus: barcodes.data[0] });
      });
      barcodes.data.shift();
    }

    const body: WbCardsUploadBody = cards;
    const uploadUrl = 'https://content-api.wildberries.ru/content/v2/cards/upload';

    await axios.post(uploadUrl, body, {
      headers: {
        Authorization: apiToken
      }
    });
    return result;
  }

  private parsePayload(request: ProductCreationRequests): CreateItemWb {
    const payload = request.payload as Partial<CreateItemWb>;

    if (!payload.subjectID || !payload.variants?.length) {
      throw new Error(`Некорректный WB payload у заявки ${request.id}`);
    }

    return {
      subjectID: payload.subjectID,
      variants: payload.variants.map(variant => ({
        vendorCode: variant.vendorCode,
        sizes: variant.sizes
      }))
    };
  }
}
