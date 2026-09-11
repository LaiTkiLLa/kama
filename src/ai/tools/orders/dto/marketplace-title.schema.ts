import { z } from 'zod';

/**
 * Канонические названия маркетплейсов (`marketplaces.title`).
 * Вторые кабинеты — отдельные значения, не смешивать с основными.
 */
export const MARKETPLACE_TITLES = ['Озон', 'WB', 'Yandex', 'Yandex Tamov', 'Ozon Tamov'] as const;

export const MarketplaceTitleSchema = z.enum(MARKETPLACE_TITLES);

export type MarketplaceTitle = z.infer<typeof MarketplaceTitleSchema>;
