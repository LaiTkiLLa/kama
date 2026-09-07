import { z } from 'zod';

export interface AiTool {
  name: string;
  description: string;
  parameters: z.ZodType;

  execute(args: unknown): Promise<unknown>;
}
