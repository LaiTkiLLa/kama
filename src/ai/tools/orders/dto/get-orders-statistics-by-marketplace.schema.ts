import { z } from 'zod';

export const GetOrdersStatisticsByMarketplaceSchema = z.object({
  dateFrom: z.iso.datetime({ local: true, offset: true }).describe(`Начало периода в формате ISO 8601.
Для одного календарного дня указывай начало этого дня.
Например, для 26 августа:
2026-08-26T00:00:00
  `),
  dateTo: z.iso.datetime({ local: true, offset: true }).describe(`Конец периода в формате ISO 8601.
Для одного календарного дня указывай начало следующего дня.
Например, для 26 августа:
2026-08-27T00:00:00
Не используй 23:59:59, если можно указать начало следующего дня.`)
});

export type GetOrdersStatisticsByMarketplaceArgs = z.infer<typeof GetOrdersStatisticsByMarketplaceSchema>;
