import { ProductCreationRequests } from '../../entities/product-creation-requests.entity';

export interface MarketplaceCardPublisher {
  readonly marketplaceTitle: string;
  publish(requests: ProductCreationRequests[]): Promise<void>;
}

export const MARKETPLACE_CARD_PUBLISHERS = 'MARKETPLACE_CARD_PUBLISHERS';
