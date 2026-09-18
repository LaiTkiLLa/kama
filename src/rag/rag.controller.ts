import { Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('rag')
export class RagController {
  constructor(private ragService: RagService) {}

  @Post('index')
  async makeIndexDocumentation(@Headers('api-key') apiKey: string) {
    if (!apiKey || apiKey !== process.env.apiKey) {
      throw new ForbiddenException('Отсутствует токен');
    }

    return this.ragService.makeIndexDocumentation();
  }
}
