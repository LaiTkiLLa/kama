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

@Module({
  imports: [OrdersModule],
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
    {
      provide: AiToolRegistry,
      inject: [GetOrderStatisticsTool, GetOrderStatisticsByMarketplaceTool],
      useFactory: (
        getOrderStatisticsTool: GetOrderStatisticsTool,
        getOrderStatisticsByMarketplaceTool: GetOrderStatisticsByMarketplaceTool
      ) => {
        const registry = new AiToolRegistry();
        registry.register(getOrderStatisticsTool);
        registry.register(getOrderStatisticsByMarketplaceTool);
        return registry;
      }
    },
    DeepSeekToolMapper
  ]
})
export class AiModule {}
