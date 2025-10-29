import { Telegraf } from 'telegraf';
import { BOT_TOKEN } from './const.js';
import { setupMain } from './commands/index.js';

if (!BOT_TOKEN) throw new Error('BOT_TOKEN is missing in environment');

export const bot = new Telegraf(BOT_TOKEN);

setupMain(bot);

bot
  .launch()
  .then(() => console.log('✅ Бот запущен'))
  .catch((err) => console.log('❌ Не удалось запустить бота', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
