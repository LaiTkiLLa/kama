import { Injectable } from '@nestjs/common';
import { MarketplaceCardPublisher } from './marketplace-card-publisher.interface';
import { ProductCreationRequests } from 'src/items/entities/product-creation-requests.entity';
import { ConfigService } from '@nestjs/config';
import { CreateItemOzonVariant, CreateItemOzon } from 'src/items/interfaces/create-item-ozon.interface';
import axios from 'axios';

@Injectable()
export class OzonCardPublisher implements MarketplaceCardPublisher {
  readonly marketplaceTitle = 'Ozon';

  constructor(private configService: ConfigService) {}

  async publish(requests: ProductCreationRequests[]): Promise<void> {
    const cards = requests.map(request => this.parsePayload(request));
    await this.uploadCards({ items: cards });
  }

  async uploadCards(cards: CreateItemOzon): Promise<void> {
    const url = 'https://api-seller.ozon.ru/v3/product/import';
    const ozonToken = this.configService.get<string>('ozonToken');
    const clientId = this.configService.get<string>('ozonClientId');
    if (!ozonToken || !clientId) return;
    const headers = {
      'Client-Id': clientId,
      'Api-Key': ozonToken
    };
    const body: CreateItemOzon = cards;
    await axios.post(url, body, { headers });
  }

  private parsePayload(request: ProductCreationRequests): CreateItemOzonVariant {
    const payload = request.payload as unknown as CreateItemOzonVariant;

    if (!payload.offer_id || !payload.price || !payload.type_id || !payload.description_category_id) {
      throw new Error(`Некорректный WB payload у заявки ${request.id}`);
    }

    return payload;
  }
}
