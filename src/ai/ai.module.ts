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
import { StocksModule } from '../stocks/stocks.module';
import { GetCurrentStocksTool } from './tools/stocks/get-current-stocks.tool';

@Module({
  imports: [OrdersModule, ItemsModule, StocksModule],
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
    GetCurrentStocksTool,
    {
      provide: AiToolRegistry,
      inject: [
        GetOrderStatisticsTool,
        GetOrderStatisticsByMarketplaceTool,
        CompareOrderPeriodsTool,
        CreateTestItemTool,
        GetCurrentStocksTool
      ],
      useFactory: (
        getOrderStatisticsTool: GetOrderStatisticsTool,
        getOrderStatisticsByMarketplaceTool: GetOrderStatisticsByMarketplaceTool,
        compareOrderPeriodsTool: CompareOrderPeriodsTool,
        createTestItemTool: CreateTestItemTool,
        getCurrentStocksTool: GetCurrentStocksTool
      ) => {
        const registry = new AiToolRegistry();
        registry.register(getOrderStatisticsTool);
        registry.register(getOrderStatisticsByMarketplaceTool);
        registry.register(compareOrderPeriodsTool);
        registry.register(createTestItemTool);
        registry.register(getCurrentStocksTool);
        return registry;
      }
    },
    DeepSeekToolMapper
  ]
})
export class AiModule {}
