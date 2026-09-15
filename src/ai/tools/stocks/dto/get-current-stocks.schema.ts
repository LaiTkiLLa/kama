import { z } from 'zod';
import { MarketplaceTitleSchema } from '../../orders/dto/marketplace-title.schema';

export const GetCurrentStocksSchema = z.object({
  article: z.string().optional().describe(`
Артикул товара.

Передавай артикул, который явно указал пользователь.
Не изменяй значение артикула и не придумывай его.

Примеры:
"артикул 12345" → "12345"
"по артикулу ABC-123" → "ABC-123"

Если пользователь не указал артикул, не передавай это поле.
`),

  marketplaceTitle: MarketplaceTitleSchema.optional().describe(`
Каноническое название маркетплейса из базы данных.

Допустимые значения:
"Озон"
"WB"
"Yandex"
"Yandex Tamov"
"Ozon Tamov"

Нормализация:
"Ozon", "озон", "озоне" → "Озон"
"WB", "ВБ", "Wildberries", "Вайлдберриз" → "WB"
"Yandex", "Яндекс", "Яндекс Маркет" → "Yandex"
"Yandex Tamov", "Яндекс Тамов" → "Yandex Tamov"
"Ozon Tamov", "Озон Тамов" → "Ozon Tamov"

Если пользователь не указал конкретный маркетплейс,
не передавай это поле.
`),

  warehouseTitle: z.string().optional().describe(`
Название конкретного склада.

Передавай только название склада, которое пользователь явно указал.

Не придумывай и не восстанавливай название склада самостоятельно.

Если пользователь указал только тип склада
("FBO", "FBS", "наш склад", "собственный склад",
"склад маркетплейса" и т.п.),
используй warehouseType, а warehouseTitle не передавай.

Если пользователь не указал конкретный склад,
не передавай это поле.
`),

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

Если пользователь указал конкретное название склада,
используй warehouseTitle.

Если тип склада невозможно определить из запроса,
не передавай это поле.
`)
});

export type GetCurrentStocksArgs = z.infer<typeof GetCurrentStocksSchema>;
