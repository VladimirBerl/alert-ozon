import { Context, Telegraf } from 'telegraf';
import api from '~/api/api.js';
import JsonStorage from '~/utils/jsonStorage.js';

const PAGE_SIZE = 5;

const storage = new JsonStorage<{ id: string; name: string; capacities?: number }>('warehouses.json');
const pendingCapacities = new Map<number, { id: string; name: string }>();

const renderWarehousesList = async (ctx: Context, page = 1) => {
  await ctx.answerCbQuery();

  const warehouses = await api.getAvailableWarehouses();
  if (!warehouses?.length) return ctx.answerCbQuery('❌ Ошибка загрузки складов');

  const start = (page - 1) * PAGE_SIZE;
  const pageItems = warehouses.slice(start, start + PAGE_SIZE);

  const inline_keyboard = pageItems.map((w) => [
    { text: `${w.warehouse.name} (${w.warehouse.id})`, callback_data: `warehouse_detail:${w.warehouse.id}` },
  ]);

  const navRow: any[] = [];
  if (page > 1) navRow.push({ text: '⬅️ Назад', callback_data: `warehouses_page:${page - 1}` });
  if (start + PAGE_SIZE < warehouses.length)
    navRow.push({ text: '➡️ Вперёд', callback_data: `warehouses_page:${page + 1}` });
  if (navRow.length) inline_keyboard.push(navRow);
  inline_keyboard.push([{ text: '🔙 В меню', callback_data: 'main_menu' }]);

  await ctx.editMessageText(`🏭 Список складов (стр. ${page}):`, { reply_markup: { inline_keyboard } });
};

const renderWarehouseDetail = async (ctx: Context, warehouseId: string) => {
  await ctx.answerCbQuery();

  const warehouses = await api.getAvailableWarehouses();
  const warehouse = warehouses.find((w) => w.warehouse.id === warehouseId);
  if (!warehouse) return ctx.answerCbQuery('❌ Склад не найден');

  const { name, id } = warehouse.warehouse;

  const capacitiesText = warehouse.schedule.capacity
    .map(
      (c) =>
        `📅 ${new Date(c.start).toLocaleDateString()}–${new Date(
          c.end
        ).toLocaleDateString()}: <b>${c.value.toLocaleString()}</b>`
    )
    .join('\n');

  const text = `🏭 <b>${name}</b>\n🆔 ID: <code>${id}</code>\n\n📦 Доступная вместимость:\n${capacitiesText}`;

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '❤️ Избранное',
            callback_data: `toggle_favorite:${id}`,
          },
        ],
        [{ text: '🔙 Назад', callback_data: 'warehouses_page:1' }],
      ],
    },
  });
};

const handleAddFavorite = async (ctx: Context, warehouseId: string) => {
  const warehouses = await api.getAvailableWarehouses();
  const w = warehouses.find((w) => w.warehouse.id === warehouseId);
  if (!w) return ctx.reply('❌ Склад не найден');

  const data = { id: w.warehouse.id, name: w.warehouse.name };

  if (storage.hasIn((el) => el.id === data.id)) {
    storage.removeIn((el) => el.id === data.id);
    await ctx.reply('❌ Убран из избранных');
  } else {
    await ctx.reply(`Введите значение вместимости для мониторинга склада ${data.name}:`);
    pendingCapacities.set(ctx.from!.id, data);
  }

  await ctx.answerCbQuery();
};

export const setupWarehousesList = (bot: Telegraf) => {
  bot.action('warehouses_list', (ctx) => renderWarehousesList(ctx, 1));
  bot.action(/^warehouses_page:(\d+)$/, (ctx) => renderWarehousesList(ctx, Number(ctx.match[1])));
  bot.action(/^warehouse_detail:(.+)$/, (ctx) => renderWarehouseDetail(ctx, ctx.match[1]));
  bot.action(/^toggle_favorite:(.+)$/, (ctx) => handleAddFavorite(ctx, ctx.match[1]));

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

    storage.add({ ...pending, capacities });
    await ctx.reply(`✅ Добавлен в избранные с вместимостью <b>${capacities}</b>`, {
      parse_mode: 'HTML',
    });
    pendingCapacities.delete(id);
  });
};
