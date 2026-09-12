import { LlmMessage, LlmResponse } from './llm-message.interface';
import { AiTool } from '../tools/ai-tool.interface';

export interface LlmProvider {
  chat(params: LlmChatParams): Promise<LlmResponse>;
}

export interface LlmChatParams {
  messages: LlmMessage[];
  tools?: AiTool[];
}
