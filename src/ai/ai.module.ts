import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DeepseekProvider } from './providers/deepseek.provider';
import { GetOrderStatisticsTool } from './tools/orders/get-order-statistics.tool';
import { AiToolRegistry } from './tools/ai-tool.registry';
import { DeepSeekToolMapper } from './providers/deepseek/deepseek-tool.mapper';
import { OrdersModule } from '../orders/orders.module';
import { GetOrderStatisticsByMarketplaceTool } from './tools/orders/get-order-statistics-by-marketplace.tool';
import { AiToolExecutor } from './tools/ai-tool-executor';
import { CompareOrderPeriodsTool } from './tools/orders/compare-order-periods.tool';
import { ItemsModule } from '../items/items.module';
import { CreateTestItemTool } from './tools/items/create-test-item.tool';

@Module({
  imports: [OrdersModule, ItemsModule],
  controllers: [AiController],
  providers: [
    AiService,
    DeepseekProvider,
    AiToolExecutor,
    {
      provide: 'LLM_PROVIDER',
      useExisting: DeepseekProvider
    },
    GetOrderStatisticsTool,
    GetOrderStatisticsByMarketplaceTool,
    CompareOrderPeriodsTool,
    CreateTestItemTool,
    {
      provide: AiToolRegistry,
      inject: [
        GetOrderStatisticsTool,
        GetOrderStatisticsByMarketplaceTool,
        CompareOrderPeriodsTool,
        CreateTestItemTool
      ],
      useFactory: (
        getOrderStatisticsTool: GetOrderStatisticsTool,
        getOrderStatisticsByMarketplaceTool: GetOrderStatisticsByMarketplaceTool,
        compareOrderPeriodsTool: CompareOrderPeriodsTool,
        createTestItemTool: CreateTestItemTool
      ) => {
        const registry = new AiToolRegistry();
        registry.register(getOrderStatisticsTool);
        registry.register(getOrderStatisticsByMarketplaceTool);
        registry.register(compareOrderPeriodsTool);
        registry.register(createTestItemTool);
        return registry;
      }
    },
    DeepSeekToolMapper
  ]
})
export class AiModule {}
