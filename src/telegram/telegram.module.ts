import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramUpdate } from './telegram.update';

@Module({
  imports: [
    ConfigModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const token = configService.getOrThrow<string>('telegramBotToken');
        if (!token) {
          throw new Error('telegramBotToken is not defined');
        }
        return {
          token
        };
      }
    })
  ],
  controllers: [],
  providers: [TelegramService, TelegramUpdate]
})
export class TelegramModule {}
