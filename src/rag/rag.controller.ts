import { Controller, Post } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('rag')
export class RagController {
  constructor(private ragService: RagService) {}

  @Post('index')
  async makeIndexDocumentation() {
    return this.ragService.makeIndexDocumentation();
  }
}
