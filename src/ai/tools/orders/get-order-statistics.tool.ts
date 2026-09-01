import { Injectable } from '@nestjs/common';
import { AiTool } from './ai-tool.interface';
import { OrdersStatisticsService } from '../../../orders/services/orders-statistics.service';
import { GetOrderStatisticsDto } from '../../../orders/dto/get-order-statistics.dto';

@Injectable()
export class GetOrderStatisticsTool implements AiTool {
  readonly name = 'get_order_statistics';

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
`;

  readonly parameters = {
    type: 'object' as const,

    properties: {
      dateFrom: {
        type: 'string',
        description: `
Начало периода в формате ISO 8601.

Для одного календарного дня указывай начало этого дня.
Например, для 26 августа:
2026-08-26T00:00:00
`
      },

      dateTo: {
        type: 'string',
        description: `

Конец периода в формате ISO 8601.

Для одного календарного дня указывай начало следующего дня.
Например, для 26 августа:
2026-08-27T00:00:00

Не используй 23:59:59, если можно указать начало следующего дня.
`
      },

      marketplaceTitle: {
        type: 'string',
        description: `

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

Если пользователь не указал маркетплейс, не передавай это поле.
`
      },

      warehouseTitle: {
        type: 'string',
        description: `

Название конкретного склада.

Передавай только название, которое пользователь явно указал
или однозначно обозначил.

Не придумывай название склада.

Если пользователь говорит только "FBO", "FBS",
"наш склад", "склад маркетплейса" и т.п.,
используй warehouseType, а warehouseTitle не передавай.
`
      },

      warehouseType: {
        type: 'string',
        enum: ['FBO', 'FBS'],
        description: `

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
`
      }
    },

    required: ['dateFrom', 'dateTo']
  };

  constructor(private readonly ordersStatisticsService: OrdersStatisticsService) {}

  async execute(args: unknown) {
    return this.ordersStatisticsService.getStatistics(args as GetOrderStatisticsDto);
  }
}
