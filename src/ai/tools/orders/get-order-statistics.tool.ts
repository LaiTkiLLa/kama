import { Injectable } from '@nestjs/common';
import { AiTool } from './ai-tool.interface';
import { OrdersStatisticsService } from '../../../orders/services/orders-statistics.service';
import { GetOrderStatisticsDto } from '../../../orders/dto/get-order-statistics.dto';

@Injectable()
export class GetOrderStatisticsTool implements AiTool {
  readonly name = 'get_order_statistics';

  readonly description = 'Получает статистику заказов за указанный период.';

  readonly parameters = {
    type: 'object' as const,

    properties: {
      dateFrom: {
        type: 'string',
        description: 'Дата и время начала периода в формате ISO 8601'
      },

      dateTo: {
        type: 'string',
        description: 'Дата и время окончания периода в формате ISO 8601'
      },

      marketplaceId: {
        type: 'number',
        description: 'ID маркетплейса. Не указывать, если нужна статистика по всем маркетплейсам.'
      },

      warehouseId: {
        type: 'number',
        description: 'ID склада. Не указывать, если нужна статистика по всем складам.'
      }
    },

    required: ['dateFrom', 'dateTo']
  };

  constructor(private readonly ordersStatisticsService: OrdersStatisticsService) {}

  async execute(args: unknown) {
    return this.ordersStatisticsService.getStatistics(args as GetOrderStatisticsDto);
  }
}
