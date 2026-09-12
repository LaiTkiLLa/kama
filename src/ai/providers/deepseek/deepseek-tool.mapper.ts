import { Injectable } from '@nestjs/common';
import { AiTool } from '../../tools/ai-tool.interface';
import { z } from 'zod';

@Injectable()
export class DeepSeekToolMapper {
  toToolDefinition(tool: AiTool) {
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: z.toJSONSchema(tool.parameters)
      }
    };
  }
}
