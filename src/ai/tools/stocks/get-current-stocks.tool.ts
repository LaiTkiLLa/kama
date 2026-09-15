import { Injectable } from '@nestjs/common';
import { AiTool } from '../ai-tool.interface';
import { GetCurrentStocksSchema } from './dto/get-current-stocks.schema';
import { StocksStatisticsService } from '../../../stocks/services/stocks-statistics.service';

@Injectable()
export class GetCurrentStocksTool implements AiTool {
  readonly name = 'get_current_stocks';
  readonly schema = GetCurrentStocksSchema;
  readonly description = `
Получает агрегированные актуальные остатки на текущий день.

Используй этот tool, когда пользователь хочет:
- узнать текущие остатки товаров;
- узнать, сколько товара сейчас осталось;
- посмотреть остатки по маркетплейсам;
- посмотреть остатки конкретного артикула;
- узнать остатки конкретного товара на конкретном маркетплейсе;
- узнать остатки на FBO или FBS;
- узнать остатки на конкретном складе;
- сравнить текущие остатки между маркетплейсами.

Фильтры (все опциональны):
- article — артикул товара;
- marketplaceTitle — конкретный маркетплейс;
- warehouseTitle — конкретный склад;
- warehouseType — тип склада FBO или FBS.

В результате — агрегат, не список товаров:
- listingsCount — сколько listing'ов попало под фильтры;
- quantityFull — сумма текущих остатков (currentValue) по всем не исключённым складам;
- inWayToClient — сумма reserved (в пути к клиенту);
- inWayFromClient — сумма promised (ожидается от клиента);
- byMarketplace[] — тот же набор показателей в разрезе маркетплейса, плюс:
  - fbsWarehouses — склады FBS с суммой остатков по title склада;
  - fboWarehouses — склады FBO с суммой остатков по title склада.

Остатки относятся только к текущему дню.

Если пользователь указал артикул, используй article.
Если пользователь не указал артикул, не передавай article —
backend вернёт агрегат по всем товарам в рамках остальных фильтров.

Если пользователь указал конкретный маркетплейс, используй marketplaceTitle.

Если пользователь указал конкретный склад, используй warehouseTitle.

Если пользователь указал только тип склада, используй warehouseType.

Если пользователь хочет сравнить остатки между маркетплейсами,
не передавай marketplaceTitle — смотри byMarketplace.

При ответе пользователю:
- для общего вопроса используй totals (listingsCount / quantityFull / inWay*);
- для сравнения кабинетов используй byMarketplace;
- склады показывай только если пользователь спросил про склады / FBO / FBS / конкретный склад.

Не используй этот tool для:
- получения исторических остатков за прошлую дату;
- получения статистики изменения остатков за период;
- получения построчного списка всех артикулов.

Если пользователь спрашивает остатки на конкретную прошлую дату,
не вызывай этот tool.

Не придумывай значения фильтров.
`;

  readonly parameters = GetCurrentStocksSchema;

  constructor(private readonly stocksStatisticsService: StocksStatisticsService) {}

  async execute(args: unknown): Promise<unknown> {
    const validatedArgs = GetCurrentStocksSchema.parse(args);

    return this.stocksStatisticsService.getCurrentStocks(validatedArgs);
  }
}
