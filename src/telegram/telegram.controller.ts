import { Body, Controller, Post } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';

@Controller('telegram')
export class TelegramController {
  @Post('webhook')
  async webhook(@Body() update: TelegramUpdate) {
    // пока просто посмотрим update

    console.log(update);

    return { ok: true };
  }
}
