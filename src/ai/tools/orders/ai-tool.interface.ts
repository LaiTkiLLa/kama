export interface AiTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };

  execute(args: unknown): Promise<unknown>;
}
