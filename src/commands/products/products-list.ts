import { Context, Telegraf } from 'telegraf';
import api from '~/api/api.js';
import { ProductItemInfo } from '~/api/types/index.js';
import singletonMonitoring from '~/storage/draft-create.js';
import pagination from '~/utils/pagination.js';

const temStorageSKU = new Map<number, number>();

const renderProductsList = async (ctx: Context, page = 1) => {
  const products = await api.productList();
  if (!products.length) return ctx.answerCbQuery('❌ Ошибка загрузки продуктов');

  try {
    await ctx.answerCbQuery();
  } catch {}

  await pagination<ProductItemInfo>({
    ctx,
    items: products,
    itemsRender: (p) => ({
      text: `${p.name} | SKU: ${p.sku}`,
      callback_data: `product_detail:${p.sku}`,
    }),
    callback_data: 'products_page',
    title: '🛍 Список продуктов',
    page,
  });
};

const renderProductDetail = async (ctx: Context, sku: string) => {
  const products = await api.searchProduct([sku]);
  const product = products?.[0];
  if (!product) return ctx.answerCbQuery('❌ Не удалось найти продукт');

  try {
    await ctx.answerCbQuery();
  } catch {}

  const text = `🛍 <b>${product.name}</b>\n🆔 SKU: <code>${product.sku}</code>`;

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '❤️ Добавить в поставку',
            callback_data: `select_product:${product.sku}`,
          },
        ],
        [
          {
            text: '🗑 Убрать с поставки',
            callback_data: `unselect_product:${product.sku}`,
          },
        ],
        [{ text: '🔙 Назад', callback_data: `products_list` }],
      ],
    },
  });
};

export const setupProductsList = (bot: Telegraf) => {
  bot.action('products_list', (ctx) => renderProductsList(ctx, 1));
  bot.action(/^products_page:(\d+)$/, (ctx) => renderProductsList(ctx, Number(ctx.match[1])));

  bot.action(/^product_detail:(\d+)$/, (ctx) => renderProductDetail(ctx, ctx.match[1]));

  bot.action(/^select_product:(\d+)$/, (ctx) => {
    const sku = parseFloat(ctx.match[1]);
    const userID = ctx.from?.id;
    const exists = temStorageSKU.has(userID);

    if (!sku || !userID) {
      return ctx.answerCbQuery('❌ Не удалось найти продукт');
    }

    if (exists) {
      return ctx.answerCbQuery('❗️Укажите кол-во продуктов');
    }

    ctx.answerCbQuery();
    ctx.reply(`Укажите кол-во продуктов для SKU: <code>${sku}</code>`, {
      parse_mode: 'HTML',
    });
    temStorageSKU.set(userID, sku);
  });

  bot.action(/^unselect_product:(\d+)$/, (ctx) => {
    const sku = parseFloat(ctx.match[1]);

    if (!sku) {
      return ctx.answerCbQuery('❌ Не удалось найти продукт');
    }

    const userID = ctx.from?.id;
    temStorageSKU.delete(userID);

    const storage = singletonMonitoring.getStorage();
    const items = storage.read().items;

    if (!items.find((i) => i.sku === sku)) {
      return ctx.answerCbQuery('❌ Продукт уже отсутствует в поставке');
    }

    storage.set(
      'items',
      items.filter((i) => i.sku !== sku)
    );
    ctx.answerCbQuery('🗑 Продукт убран из поставки');

    if (storage.read().status) {
      singletonMonitoring.stopMonitoring();
      ctx.reply('⚠️ Мониторинг был остановлен из-за изменения данных');
    }
  });

  bot.on('message', (ctx, next) => {
    const userID = ctx.from?.id;
    const sku = temStorageSKU.get(userID);

    if (!('text' in ctx.message) || !sku) {
      temStorageSKU.delete(userID);
      return next();
    }

    const quantity = parseInt(ctx.message.text);

    if (isNaN(quantity) || quantity <= 0) {
      return ctx.reply('❌ Введите корректное кол-во');
    }

    const storage = singletonMonitoring.getStorage();
    const items = storage.read().items.filter((i) => i.sku !== sku);

    storage.set('items', [...items, { sku, quantity }]);
    ctx.reply(`✅ Продукт добавлен! SKU: <code>${sku}</code>, кол-во: <code>${quantity}</code>`, {
      parse_mode: 'HTML',
    });
    temStorageSKU.delete(userID);

    if (storage.read().status) {
      singletonMonitoring.stopMonitoring();
      ctx.reply('⚠️ Мониторинг был остановлен из-за изменения данных');
    }
  });
};
