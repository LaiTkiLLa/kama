import { Injectable } from '@nestjs/common';
import { AiTool } from '../../tools/orders/ai-tool.interface';

@Injectable()
export class DeepSeekToolMapper {
  toToolDefinition(tool: AiTool) {
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    };
  }
}
