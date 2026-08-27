import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  MoySkladCustomerOrder,
  MoySkladListResponse,
  MoySkladStockAllRow
} from './interfaces/moysklad-api.interface';

@Injectable()
export class MoySkladClient {
  private readonly logger = new Logger(MoySkladClient.name);
  private readonly baseUrl = 'https://api.moysklad.ru/api/remap/1.2';
  private readonly http: AxiosInstance;

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('moyskladToken');
    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip'
      },
      timeout: 60_000
    });
  }

  isConfigured(): boolean {
    return Boolean(this.configService.get<string>('moyskladToken'));
  }

  storeHref(storeId: string): string {
    return `${this.baseUrl}/entity/store/${storeId}`;
  }

  organizationHref(organizationId: string): string {
    return `${this.baseUrl}/entity/organization/${organizationId}`;
  }

  counterpartyHref(agentId: string): string {
    return `${this.baseUrl}/entity/counterparty/${agentId}`;
  }

  assortmentHrefFromMeta(href: string): string {
    return href.split('?')[0];
  }

  assortmentIdFromHref(href: string): string | null {
    const clean = this.assortmentHrefFromMeta(href);
    const match = clean.match(/\/entity\/(?:product|variant|consignment)\/([0-9a-f-]{36})$/i);
    return match?.[1] ?? null;
  }

  async getStockAllByStore(storeId: string): Promise<MoySkladStockAllRow[]> {
    const rows: MoySkladStockAllRow[] = [];
    let offset = 0;
    const limit = 1000;
    const store = this.storeHref(storeId);

    for (;;) {
      const data = await this.requestWithRetry<MoySkladListResponse<MoySkladStockAllRow>>(
        'GET',
        '/report/stock/all',
        {
          params: {
            filter: `store=${store};stockMode=all`,
            limit,
            offset
          }
        }
      );
      rows.push(...(data.rows ?? []));
      if (!data.rows?.length || offset + limit >= data.meta.size) {
        break;
      }
      offset += limit;
    }

    return rows;
  }

  async createCustomerOrder(body: Record<string, unknown>): Promise<MoySkladCustomerOrder> {
    return this.requestWithRetry<MoySkladCustomerOrder>('POST', '/entity/customerorder', { data: body });
  }

  async updateCustomerOrder(id: string, body: Record<string, unknown>): Promise<MoySkladCustomerOrder> {
    return this.requestWithRetry<MoySkladCustomerOrder>('PUT', `/entity/customerorder/${id}`, {
      data: body
    });
  }

  private async requestWithRetry<T>(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    options: { params?: Record<string, unknown>; data?: unknown } = {},
    attempt = 0
  ): Promise<T> {
    try {
      const response = await this.http.request<T>({
        method,
        url: path,
        params: options.params,
        data: options.data
      });
      return response.data;
    } catch (error) {
      const status = error instanceof AxiosError ? error.response?.status : undefined;
      if (status === 429 && attempt < 5) {
        const delayMs = Math.min(30_000, 1000 * 2 ** attempt);
        this.logger.warn(`МойСклад 429 на ${path}, retry через ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.requestWithRetry<T>(method, path, options, attempt + 1);
      }
      throw error;
    }
  }
}
