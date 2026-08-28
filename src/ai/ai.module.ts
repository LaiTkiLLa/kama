import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DeepseekProvider } from './providers/deepseek.provider';
import { GetOrderStatisticsTool } from './tools/orders/get-order-statistics.tool';
import { AiToolRegistry } from './tools/ai-tool.registry';
import { DeepSeekToolMapper } from './providers/deepseek/deepseek-tool.mapper';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [AiController],
  providers: [
    AiService,
    DeepseekProvider,
    {
      provide: 'LLM_PROVIDER',
      useExisting: DeepseekProvider
    },
    GetOrderStatisticsTool,
    {
      provide: AiToolRegistry,
      inject: [GetOrderStatisticsTool],
      useFactory: (getOrderStatisticsTool: GetOrderStatisticsTool) => {
        const registry = new AiToolRegistry();
        registry.register(getOrderStatisticsTool);
        return registry;
      }
    },
    DeepSeekToolMapper
  ]
})
export class AiModule {}
