import { Inject, Injectable } from '@nestjs/common';
import { LlmProvider } from './contracts/llm-provider.interface';
import { AiToolRegistry } from './tools/ai-tool.registry';
import { LlmMessage } from './contracts/llm-message.interface';

@Injectable()
export class AiService {
  constructor(
    @Inject('LLM_PROVIDER')
    private readonly llmProvider: LlmProvider,
    private readonly toolRegistry: AiToolRegistry
  ) {}

  async chat(message: string) {
    const tools = this.toolRegistry.getAll();
    const currentDate = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      dateStyle: 'full',
      timeStyle: 'long'
    }).format(new Date());

    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: `
Текущая дата и время: ${currentDate}.
Часовой пояс: Europe/Moscow.

Используй эту дату как источник истины.
Относительные даты ("сегодня", "вчера", "позавчера", "завтра")
вычисляй относительно неё.

Отвечай непосредственно на вопрос пользователя.
Не добавляй дополнительную информацию, которую пользователь не запрашивал.
Если пользователь спрашивает количество заказов, сообщи количество заказов.
Не выводи totalQuantity, totalPrice или totalPayout,
если пользователь явно не спрашивал об этих показателях.

Не показывай пользователю технические детали работы tools.
Не упоминай названия tools, tool calls, JSON или внутренние параметры.
      `.trim()
      },
      {
        role: 'user',
        content: message
      }
    ];

    while (true) {
      const response = await this.llmProvider.chat({
        messages,
        tools
      });

      if (!response.toolCalls?.length) {
        return {
          answer: response.content
        };
      }

      messages.push(response.rawMessage);

      for (const toolCall of response.toolCalls) {
        const tool = this.toolRegistry.get(toolCall.name);

        if (!tool) {
          throw new Error(`Tool "${toolCall.name}" not found`);
        }

        const args = JSON.parse(toolCall.arguments);

        const result = await tool.execute(args);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
    }
  }
}
