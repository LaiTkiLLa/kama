import { Injectable } from '@nestjs/common';
import { AiTool } from './ai-tool.interface';
import { OrdersStatisticsService } from '../../../orders/services/orders-statistics.service';
import { GetOrdersStatisticsByMarketplaceDto } from '../../../orders/dto/get-order-statistics.dto';

@Injectable()
export class GetOrderStatisticsByMarketplaceTool implements AiTool {
  readonly name = 'get_order_statistics_by_marketplace';

  readonly description = `
Получает количество заказов в разрезе маркетплейсов за указанный период.

Используй этот tool, когда пользователь хочет:
- узнать количество заказов по каждому маркетплейсу;
- сравнить количество заказов между маркетплейсами;
- получить статистику заказов за последние N дней в разрезе маркетплейсов.

Примеры запросов пользователя:
- "сколько заказов было за последние 7 дней по маркетплейсам"
- "сколько заказов было за последние 15 дней в разрезе МП"
- "покажи заказы за последние 30 дней по каждому маркетплейсу"
- "сравни количество заказов между маркетплейсами за месяц"

Дата:
- dateFrom — начало периода.
- dateTo — конец периода.
- Используй текущую дату из system message.
- "последние 7 дней" → сегодня и предыдущие 6 календарных дней.
- "последние 15 дней" → сегодня и предыдущие 14 календарных дней.
- "последние 30 дней" → сегодня и предыдущие 29 календарных дней.

Этот tool группирует результат по маркетплейсам самостоятельно.
Не нужно передавать marketplaceTitle.

Используй этот tool, если пользователь хочет сравнить или получить
результаты одновременно для нескольких маркетплейсов.

Не используй этот tool для запроса статистики одного конкретного маркетплейса.
Для этого используй get_order_statistics.
`;

  readonly parameters = {
    type: 'object' as const,

    properties: {
      dateFrom: {
        type: 'string',
        description: `
Начало периода в формате ISO 8601.
`
      },

      dateTo: {
        type: 'string',
        description: `
Конец периода в формате ISO 8601.
`
      }
    },

    required: ['dateFrom', 'dateTo']
  };

  constructor(private readonly ordersStatisticsService: OrdersStatisticsService) {}

  async execute(args: unknown): Promise<unknown> {
    return this.ordersStatisticsService.getStatisticsByMarketplace(
      args as GetOrdersStatisticsByMarketplaceDto
    );
  }
}
