import { Injectable } from '@nestjs/common';
import { AiToolRegistry } from './ai-tool.registry';
import { LlmToolCall } from '../contracts/llm-message.interface';

@Injectable()
export class AiToolExecutor {
  constructor(private readonly toolRegistry: AiToolRegistry) {}

  async execute(toolCall: LlmToolCall) {
    const tool = this.toolRegistry.get(toolCall.name);

    if (!tool) {
      throw new Error(`Tool "${toolCall.name}" not found`);
    }

    const rawArgs = JSON.parse(toolCall.arguments);

    const validatedArgs = tool.parameters.parse(rawArgs);

    return tool.execute(validatedArgs);
  }
}
