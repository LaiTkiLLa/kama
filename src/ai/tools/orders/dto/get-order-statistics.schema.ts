import { z } from 'zod';

export const GetOrderStatisticsSchema = z.object({
  dateFrom: z.iso.datetime({ local: true, offset: true }).describe(
    `Начало периода в формате ISO 8601.
Для одного календарного дня указывай начало этого дня.
Например, для 26 августа:
2026-08-26T00:00:00`
  ),
  dateTo: z.iso.datetime({ local: true, offset: true }).describe(`
  Конец периода в формате ISO 8601.
Для одного календарного дня указывай начало следующего дня.
Например, для 26 августа:
2026-08-27T00:00:00
Не используй 23:59:59, если можно указать начало следующего дня.`),
  marketplaceTitle: z.string().optional().describe(`
  Каноническое название маркетплейса из базы данных.
Допустимые значения:
"Озон"
"WB"
"Yandex"
"Yandex Tamov"
"Ozon Tamov"
Примеры нормализации:
"Ozon", "озон", "озоне" → "Озон"
"WB", "ВБ", "Wildberries", "Вайлдберриз" → "WB"
"Yandex", "Яндекс", "Яндекс Маркет" → "Yandex"
"Yandex Tamov", "Яндекс Тамов" → "Yandex Tamov"
"Ozon Tamov", "Озон Тамов" → "Ozon Tamov"
Если пользователь не указал маркетплейс, не передавай это поле.`),
  warehouseTitle: z.string().optional().describe(`
  Название конкретного склада.
Передавай только название, которое пользователь явно указал
или однозначно обозначил.
Не придумывай название склада.
Если пользователь говорит только "FBO", "FBS",
"наш склад", "склад маркетплейса" и т.п.,
используй warehouseType, а warehouseTitle не передавай.`),
  warehouseType: z.enum(['FBO', 'FBS']).optional().describe(`
  Тип склада.
FBO — склад маркетплейса.
FBS — собственный склад продавца.
Примеры:
"наш склад" → FBS
"собственный склад" → FBS
"FBS" → FBS
"склад Ozon" → FBO
"склад WB" → FBO
"склад маркетплейса" → FBO
"FBO" → FBO

Если тип склада невозможно определить из запроса,
не передавай это поле.
  `)
});

export type GetOrderStatisticsArgs = z.infer<typeof GetOrderStatisticsSchema>;
