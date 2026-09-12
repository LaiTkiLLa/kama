import { Injectable } from '@nestjs/common';
import { AiTool } from '../ai-tool.interface';
import { OrdersStatisticsService } from '../../../orders/services/orders-statistics.service';
import { GetOrderStatisticsSchema } from './dto/get-order-statistics.schema';

@Injectable()
export class GetOrderStatisticsTool implements AiTool {
  readonly name = 'get_order_statistics';
  readonly schema = GetOrderStatisticsSchema;
  readonly description = `
Получает агрегированную статистику заказов за указанный период.

Используй этот tool, когда пользователь спрашивает:

* сколько было заказов;
* сколько товаров было заказано;
* общую сумму заказов;
* общую сумму выплат продавцу;
* статистику заказов за определённый период;
* статистику заказов конкретного маркетплейса или склада.

Дата:

* dateFrom — начало периода.
* dateTo — конец периода.
* Используй текущую дату и время из system message как источник истины.
* "сегодня" — текущий календарный день.
* "вчера" — предыдущий календарный день.
* "позавчера" — два календарных дня назад.
* "завтра" — следующий календарный день.
* Для периода за один календарный день dateFrom должен быть началом этого дня, а dateTo — началом следующего дня.

Маркетплейсы:
В базе данных используются следующие канонические названия:

* "Озон"
* "WB"
* "Yandex"
* "Yandex Tamov"
* "Ozon Tamov"

Всегда используй именно эти значения в marketplaceTitle.

Нормализация названий:

* "Ozon", "озон", "озоне", "Озон" → "Озон"
* "WB", "wb", "ВБ", "вб", "Wildberries", "Вайлдберриз", "Вайлдберис" → "WB"
* "Yandex", "Яндекс", "Яндекс Маркет" → "Yandex"
* "Yandex Tamov", "Яндекс Тамов" → "Yandex Tamov"
* "Ozon Tamov", "Озон Тамов" → "Ozon Tamov"

Если пользователь не указал маркетплейс, не передавай marketplaceTitle.

Склады:

* warehouseTitle — название конкретного склада, если пользователь его явно указал.
* warehouseType = FBS, если пользователь говорит о собственном складе продавца.
* warehouseType = FBO, если пользователь говорит о складе маркетплейса.

Примеры:

* "наш склад" → FBS
* "наши склады" → FBS
* "собственный склад" → FBS
* "склад продавца" → FBS
* "FBS" → FBS
* "склад Ozon" → FBO
* "склад WB" → FBO
* "склад маркетплейса" → FBO
* "FBO" → FBO

Если пользователь явно указал название склада, передай его в warehouseTitle.

Не придумывай warehouseTitle, если пользователь не указал название склада.

Если пользователь указал только тип склада (FBO/FBS), не придумывай warehouseTitle.

Если пользователь не указал тип склада, не придумывай warehouseType.

Если пользователь не указал маркетплейс, не придумывай marketplaceTitle.

Никогда не передавай внутренние ID маркетплейсов или складов. Backend самостоятельно определяет соответствующие ID по переданным названиям.

Результат содержит:
- ordersCount — количество заказов;
- totalQuantity — общее количество заказанных товаров;
- totalPrice — общая стоимость заказов;
- totalPayout — общая сумма выплат продавцу.

При формировании ответа пользователю используй только те показатели,
которые относятся к его вопросу.

Если пользователь спрашивает только количество заказов,
не выводи totalQuantity, totalPrice и totalPayout.
Если пользователь спрашивает сумму заказов,
используй totalPrice.
Если пользователь спрашивает сумму выплат,
используй totalPayout.
Если пользователь спрашивает количество товаров,
используй totalQuantity.
`;

  readonly parameters = GetOrderStatisticsSchema;

  constructor(private readonly ordersStatisticsService: OrdersStatisticsService) {}

  async execute(args: unknown) {
    const validatedArgs = GetOrderStatisticsSchema.parse(args);
    return this.ordersStatisticsService.getStatistics(validatedArgs);
  }
}
