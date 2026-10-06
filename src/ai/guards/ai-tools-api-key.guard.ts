import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Guard для Domain AI Tools API (MCP gateway).
 * Заголовок `x-api-key` должен совпадать с `AI_TOOLS_API_KEY`.
 * Не путать с Sheets-ключом `api-key` / `process.env.apiKey`.
 */
@Injectable()
export class AiToolsApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('aiToolsApiKey');

    if (!expected) {
      throw new ServiceUnavailableException('AI_TOOLS_API_KEY is not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-api-key'];
    const key = Array.isArray(provided) ? provided[0] : provided;

    if (!key || key !== expected) {
      throw new UnauthorizedException('Invalid or missing x-api-key');
    }

    return true;
  }
}
