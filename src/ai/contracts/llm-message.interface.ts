import { ChatCompletionMessageParam } from 'openai/resources/chat/completions/completions';

export type LlmMessage = ChatCompletionMessageParam;

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface LlmResponse {
  role: 'assistant';
  content: string | null;
  toolCalls?: LlmToolCall[];
  rawMessage: LlmMessage;
}
