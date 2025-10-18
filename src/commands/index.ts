import { Context, Telegraf } from 'telegraf';

import { setupWarehousesCommands } from './warehouses/index.js';
import MonitoringService from '~/utils/monitoringCapacities.js';
import { isAdmin } from '~/middleware/is_admin.js';

const renderMenu = async (ctx: Context) => {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '▶️ Запустить мониторинг', callback_data: 'root_start_monitoring' }],
        [{ text: '⏹️ Прекратить мониторинг', callback_data: 'root_stop_monitoring' }],
        [{ text: '📋 Список складов', callback_data: 'warehouses_list' }],
        [{ text: '❤️ Избранные склады', callback_data: 'warehouses_favorite_list' }],
      ],
    },
  };

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery();
    await ctx.editMessageText('Привет! Я бот для мониторинга слотов Ozon.', keyboard);
  } else {
    await ctx.reply('Привет! Я бот для мониторинга слотов Ozon.', keyboard);
  }
};

export const setupMain = (bot: Telegraf) => {
  bot.command('start', isAdmin, renderMenu);
  bot.action('main_menu', renderMenu);

  bot.action('root_start_monitoring', async (ctx) => {
    const monitor = MonitoringService.getInstance(bot, ctx.from?.id);
    const state = monitor.start(60_000 * 10);

    if (state) {
      await ctx.answerCbQuery('✅ Мониторинг запущен');
    } else {
      await ctx.answerCbQuery('❌ Мониторинг уже запущен');
    }
  });
  bot.action('root_stop_monitoring', async (ctx) => {
    const monitor = MonitoringService.getInstance(bot, ctx.from?.id);
    const state = monitor.stop();

    if (state) {
      await ctx.answerCbQuery('✅ Мониторинг прерван');
    } else {
      await ctx.answerCbQuery('❌ Мониторинг уже прерван');
    }
  });

  setupWarehousesCommands(bot);
};
