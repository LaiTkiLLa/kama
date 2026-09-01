import { Ctx, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

@Update()
export class TelegramUpdate {
  @Start()
  async onStart(@Ctx() ctx: Context) {
    await ctx.reply('Привет! Я AI-бот Kama.');
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    console.log(ctx.message);
    if (!ctx.message || !('text' in ctx.message)) {
      return;
    }
    console.log(ctx.message.text);

    await ctx.reply(`Ты написал: ${ctx.message.text}`);
  }
}
