import { Context, Telegraf } from 'telegraf';
import JsonStorage from '~/utils/jsonStorage.js';
import MonitoringService from '~/utils/monitoringCapacities.js';

const PAGE_SIZE = 5;
const storage = new JsonStorage<{ id: string; name: string; capacities?: number }>('warehouses.json');
const pendingCapacities = new Map<number, { id: string; name: string }>();

const renderWarehousesFavoriteList = async (ctx: Context, page = 1) => {
  const warehouses = storage.read();
  if (!warehouses?.length) return ctx.answerCbQuery('❌ Нет избранных складов');

  const start = (page - 1) * PAGE_SIZE;
  const pageItems = warehouses.slice(start, start + PAGE_SIZE);

  const inline_keyboard = pageItems.map((w) => [
    {
      text: `${w.name} (${w.id})`,
      callback_data: `warehouse_favorite_detail:${w.id}`,
    },
  ]);

  const navRow: any[] = [];
  if (page > 1) navRow.push({ text: '⬅️ Назад', callback_data: `warehouses_favorite_page:${page - 1}` });
  if (start + PAGE_SIZE < warehouses.length)
    navRow.push({ text: '➡️ Вперёд', callback_data: `warehouses_favorite_page:${page + 1}` });
  if (navRow.length) inline_keyboard.push(navRow);
  inline_keyboard.push([{ text: '🔙 В меню', callback_data: 'main_menu' }]);

  await ctx.editMessageText(`🏭 Список избранных складов (стр. ${page}):`, {
    reply_markup: { inline_keyboard },
  });
  await ctx.answerCbQuery();
};

const renderWarehouseFavoriteDetail = async (ctx: Context, warehouseId: string) => {
  await ctx.answerCbQuery();

  const warehouse = storage.read().find((w) => w.id === warehouseId);
  if (!warehouse) return ctx.answerCbQuery('❌ Склад не найден');

  const { name, id, capacities } = warehouse;

  const text = `🏭 <b>${name}</b>\n🆔 ID: <code>${id}</code>\n\n📦 Указанная вместимость:\n${capacities}`;

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '▶️ Запустить мониторинг', callback_data: `start_monitoring:${id}` }],
        [{ text: '⏹️ Прервать мониторинг', callback_data: `stop_monitoring:${id}` }],
        [{ text: '✏️ Изменить вместимость', callback_data: `change_capacity:${id}` }],
        [{ text: '🗑️ Удалить из избранного', callback_data: `delete_favorite:${id}` }],
        [{ text: '🔙 Назад', callback_data: 'warehouses_favorite_list' }],
      ],
    },
  });
};

export const setupWarehousesFavorite = (bot: Telegraf) => {
  bot.action('warehouses_favorite_list', (ctx) => renderWarehousesFavoriteList(ctx, 1));
  bot.action(/^warehouses_favorite_page:(\d+)$/, (ctx) =>
    renderWarehousesFavoriteList(ctx, Number(ctx.match[1]))
  );
  bot.action(/^warehouse_favorite_detail:(.+)$/, (ctx) => renderWarehouseFavoriteDetail(ctx, ctx.match[1]));

  bot.action(/^start_monitoring:(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    if (!storage.hasIn((el) => el.id === id)) return await ctx.answerCbQuery('❌ Склад не найден');
    const monitor = MonitoringService.getInstance(bot, ctx.from?.id);
    monitor.addMonitoring((el) => el.id === id, storage.read().find((w) => w.id === id)!);
    const state = monitor.start(60_000 * 10);
    await ctx.answerCbQuery('✅ Мониторинг запущен');
  });

  bot.action(/^stop_monitoring:(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    if (!storage.hasIn((el) => el.id === id)) return await ctx.answerCbQuery('❌ Склад не найден');
    const monitor = MonitoringService.getInstance(bot, ctx.from?.id);
    monitor.removeMonitoring((el) => el.id === id);
    await ctx.answerCbQuery('🔴 Мониторинг прерван');
  });

  bot.action(/^delete_favorite:(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    if (!storage.hasIn((el) => el.id === id)) return await ctx.answerCbQuery('❌ Склад не найден');

    storage.removeIn((el) => el.id === id);
    await ctx.answerCbQuery('🗑️ Склад удален из избранного');
    renderWarehousesFavoriteList(ctx, 1);
  });

  bot.action(/^change_capacity:(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    if (!storage.hasIn((el) => el.id === id)) return await ctx.answerCbQuery('❌ Склад не найден');
    const warehouse = storage.read().find((w) => w.id === id)!;

    ctx.answerCbQuery();
    await ctx.reply(`Введите значение вместимости для мониторинга склада ${warehouse?.name}:`);
    pendingCapacities.set(ctx.from!.id, warehouse);
  });

  bot.on('message', async (ctx, next) => {
    const id = ctx.from?.id;
    const pending = pendingCapacities.get(id);
    if (!('text' in ctx.message) || !pending) {
      pendingCapacities.delete(id);
      return next();
    }

    const capacities = Number(ctx.message.text.trim());
    if (isNaN(capacities) || capacities <= 0) {
      return ctx.reply('❌ Введите корректное число вместимости');
    }

    storage.updateIn(
      (el) => el.id === pending.id,
      (el) => ({ ...el, capacities })
    );

    await ctx.reply(`✅ Значение изменено! Новое значение <b>${capacities}</b>`, {
      parse_mode: 'HTML',
    });
    pendingCapacities.delete(id);
  });
};
