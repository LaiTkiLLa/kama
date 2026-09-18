import { Injectable, Logger } from '@nestjs/common';
import { ZodError } from 'zod';
import { AiToolRegistry } from './ai-tool.registry';
import { LlmToolCall } from '../contracts/llm-message.interface';

export interface AiToolError {
  error: string;
}

@Injectable()
export class AiToolExecutor {
  constructor(private readonly toolRegistry: AiToolRegistry) {}

  private readonly logger = new Logger(AiToolExecutor.name);

  /**
   * Выполняет tool call. Любая ошибка (tool не найден, невалидные аргументы,
   * сбой внешнего сервиса) возвращается LLM как `{ error }`, а не пробрасывается
   * наружу — иначе один упавший tool превращает весь chat в HTTP 500.
   */
  async execute(toolCall: LlmToolCall): Promise<unknown> {
    const tool = this.toolRegistry.get(toolCall.name);

    if (!tool) {
      return this.fail(toolCall, `Инструмент "${toolCall.name}" не найден`);
    }

    let rawArgs: unknown;

    try {
      rawArgs = JSON.parse(toolCall.arguments);
    } catch {
      return this.fail(toolCall, 'Аргументы инструмента — не валидный JSON');
    }

    try {
      const validatedArgs = tool.parameters.parse(rawArgs);

      return await tool.execute(validatedArgs);
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues
          .map(issue => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
          .join('; ');

        return this.fail(toolCall, `Невалидные аргументы: ${details}`);
      }

      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Tool "${toolCall.name}" failed: ${message}`,
        error instanceof Error ? error.stack : undefined
      );

      return this.fail(toolCall, `Инструмент временно недоступен: ${message}`);
    }
  }

  private fail(toolCall: LlmToolCall, error: string): AiToolError {
    this.logger.warn(`Tool "${toolCall.name}": ${error}`);

    return { error };
  }
}
