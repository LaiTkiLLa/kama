import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { AiToolRegistry } from './tools/ai-tool.registry';
import { AiToolExecutor } from './tools/ai-tool-executor';
import { AiToolsApiKeyGuard } from './guards/ai-tools-api-key.guard';

/** Элемент каталога Domain AI Tools API (контракт MCP gateway). */
export interface AiToolCatalogItem {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly toolRegistry: AiToolRegistry,
    private readonly toolExecutor: AiToolExecutor
  ) {}

  @Post('chat')
  async chat(@Body() dto: ChatDto) {
    const response = await this.aiService.chat(dto.message);

    return {
      response
    };
  }

  /**
   * Каталог tools для MCP gateway (`DomainApiClient.list_tools`).
   * Путь с global prefix: `GET /api/ai/tools`.
   */
  @Get('tools')
  @UseGuards(AiToolsApiKeyGuard)
  listTools(): AiToolCatalogItem[] {
    return this.toolRegistry.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: z.toJSONSchema(tool.parameters) as Record<string, unknown>
    }));
  }

  /**
   * Вызов tool для MCP gateway (`DomainApiClient.execute_tool`).
   * Body — аргументы tool (JSON object). Результат / `{ error }` как у in-app executor.
   */
  @Post('tools/:toolName')
  @UseGuards(AiToolsApiKeyGuard)
  async executeTool(
    @Param('toolName') toolName: string,
    @Body() body: Record<string, unknown> = {}
  ): Promise<unknown> {
    return this.toolExecutor.execute({
      id: 'http',
      name: toolName,
      arguments: JSON.stringify(body ?? {})
    });
  }
}
