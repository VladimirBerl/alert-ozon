import { Context, Telegraf } from 'telegraf';

import { setupWarehousesCommands } from './warehouses/index.js';
import { isAdmin } from '~/middleware/is_admin.js';
import { setupProductsCommands } from './products/index.js';
import { setupTimeSlotCommands } from './time-slot/index.js';
import { setupMonitoringCommands } from './monitoring/index.js';
import { setupCrossWarehousesCommands } from './cross-warehouses/index.js';

const renderMenu = async (ctx: Context) => {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛍 Список товаров в поставке', callback_data: 'products_list' }],
        [{ text: '📋 Список кластеров для доставки', callback_data: 'clusters_list' }],
        [{ text: '🏭 Список кросс-складов для отгрузки', callback_data: 'cross_clusters_list' }],
        [{ text: '🗓 Предпочтительный тайм-слот', callback_data: 'time_slot_list' }],
        [{ text: '▶️ Запустить мониторинг', callback_data: 'root_start_monitoring' }],
        [{ text: '⏹️ Прекратить мониторинг', callback_data: 'root_stop_monitoring' }],
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

  setupWarehousesCommands(bot);
  setupCrossWarehousesCommands(bot);
  setupProductsCommands(bot);
  setupTimeSlotCommands(bot);
  setupMonitoringCommands(bot);
};
