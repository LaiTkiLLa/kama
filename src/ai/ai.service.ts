import { Inject, Injectable } from '@nestjs/common';
import { LlmProvider } from './contracts/llm-provider.interface';
import { AiToolRegistry } from './tools/ai-tool.registry';
import { LlmMessage } from './contracts/llm-message.interface';
import { AiToolExecutor } from './tools/ai-tool-executor';

@Injectable()
export class AiService {
  constructor(
    @Inject('LLM_PROVIDER')
    private readonly llmProvider: LlmProvider,
    private readonly toolRegistry: AiToolRegistry,
    private readonly toolExecutor: AiToolExecutor
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
Не добавляй информацию, которую пользователь не запрашивал.

Используй доступные инструменты, если они позволяют получить
точный ответ или выполнить запрошенное действие.

Не придумывай значения параметров, которых нет в сообщении пользователя
или в доступном контексте.

Если для вызова инструмента не хватает обязательных параметров,
не вызывай инструмент.
Попроси пользователя указать только недостающие параметры.

Не показывай пользователю технические детали работы инструментов.
Не упоминай названия инструментов, tool calls, JSON,
внутренние ID или технические параметры.

Если инструмент успешно выполнил действие,
сообщи пользователю результат в понятной форме.

Если инструмент вернул ошибку,
сообщи пользователю понятную причину ошибки,
не раскрывая внутренние технические детали.
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
        const result = await this.toolExecutor.execute(toolCall);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
    }
  }
}
