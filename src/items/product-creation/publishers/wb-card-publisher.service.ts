import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ProductCreationRequests } from '../../entities/product-creation-requests.entity';
import { CreateItemWb, WbCardsUploadBody } from '../../interfaces/create-item-wb.interface';
import { MarketplaceCardPublisher } from './marketplace-card-publisher.interface';

@Injectable()
export class WbCardPublisher implements MarketplaceCardPublisher {
  readonly marketplaceTitle = 'WB';

  private readonly uploadUrl = 'https://content-api.wildberries.ru/content/v2/cards/upload';

  constructor(private configService: ConfigService) {}

  async publish(requests: ProductCreationRequests[]): Promise<void> {
    const cards = requests.map(request => this.parsePayload(request));
    await this.uploadCards(cards);
  }

  private async uploadCards(cards: CreateItemWb[]): Promise<void> {
    if (!cards.length) {
      return;
    }

    const body: WbCardsUploadBody = cards;
    const apiToken = this.configService.get<string>('wbToken');

    await axios.post(this.uploadUrl, body, {
      headers: {
        Authorization: apiToken
      }
    });
  }

  private parsePayload(request: ProductCreationRequests): CreateItemWb {
    const payload = request.payload as Partial<CreateItemWb>;

    if (!payload.subjectID || !payload.variants?.length) {
      throw new Error(`Некорректный WB payload у заявки ${request.id}`);
    }

    return {
      subjectID: payload.subjectID,
      variants: payload.variants.map(variant => ({
        ...variant,
        vendorCode: variant.vendorCode ?? request.item.article
      }))
    };
  }
}
