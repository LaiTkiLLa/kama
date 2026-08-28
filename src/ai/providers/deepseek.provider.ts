import { LlmChatParams, LlmProvider } from '../contracts/llm-provider.interface';
import { OpenAI } from 'openai';
import { Injectable } from '@nestjs/common';
import { LlmResponse } from '../contracts/llm-message.interface';
import { DeepSeekToolMapper } from './deepseek/deepseek-tool.mapper';

@Injectable()
export class DeepseekProvider implements LlmProvider {
  private readonly client: OpenAI;

  constructor(private readonly toolMapper: DeepSeekToolMapper) {
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com'
    });
  }

  async chat({ messages, tools }: LlmChatParams): Promise<LlmResponse> {
    const toolDefinitions = tools?.map(tool => this.toolMapper.toToolDefinition(tool));

    const response = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      tools: toolDefinitions
    });

    const message = response.choices[0].message;

    const toolCalls = message.tool_calls
      ?.filter(toolCall => toolCall.type === 'function')
      .map(toolCall => ({
        id: toolCall.id,
        name: toolCall.function.name,
        arguments: toolCall.function.arguments
      }));

    return {
      role: 'assistant',
      content: message.content,
      toolCalls,
      rawMessage: message
    };
  }
}
