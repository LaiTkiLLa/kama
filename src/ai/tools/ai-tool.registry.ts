import { Injectable } from '@nestjs/common';
import { AiTool } from './ai-tool.interface';

@Injectable()
export class AiToolRegistry {
  private readonly tools = new Map<string, AiTool>();

  register(tool: AiTool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): AiTool | undefined {
    return this.tools.get(name);
  }

  getAll(): AiTool[] {
    return Array.from(this.tools.values());
  }
}
