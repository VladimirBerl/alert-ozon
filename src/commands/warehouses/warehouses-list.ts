import { Context, Telegraf } from 'telegraf';
import api from '~/api/api.js';
import { Cluster, Warehouse, WarehouseSearchItem } from '~/api/types/index.js';
import singletonMonitoring from '~/storage/draft-create.js';
import pagination from '~/utils/pagination.js';
import { translateWarehouseFBOType, translateWarehouseType } from '~/utils/translate-warehouse.js';

const renderClustersList = async (ctx: Context, page = 1) => {
  const clusters = await api.clustersList();
  if (!clusters.length) return ctx.answerCbQuery('❌ Ошибка загрузки складов');

  try {
    await ctx.answerCbQuery();
  } catch {}

  await pagination<Cluster>({
    ctx,
    items: clusters,
    itemsRender: (c) => ({
      text: `${c.name} | кол-во складов: ${c.logistic_clusters.length}`,
      callback_data: `warehouses_page:${c.id}`,
    }),
    callback_data: 'clusters_page',
    title: '🏭 Список кластеров',
    page,
  });
};

const renderWarehousesList = async (ctx: Context, clusterID: string, page = 1) => {
  const clusters = await api.clustersList();
  const cluster = clusters.find((c) => c.id === parseFloat(clusterID));
  if (!cluster || cluster.logistic_clusters.length === 0) return ctx.answerCbQuery('❌ Кластер не найден');

  try {
    await ctx.answerCbQuery();
  } catch {}

  const warehouses = cluster.logistic_clusters
    .map((l) => l.warehouses)
    .flat()
    .filter((w) => w.type === 'CROSS_DOCK');

  await pagination<Warehouse>({
    ctx,
    items: warehouses,
    itemsRender: (w) => ({
      text: `${w.name} | Тип: ${translateWarehouseType(w.type)}`,
      callback_data: `warehouse_detail:${clusterID}:${w.warehouse_id}`,
    }),
    callback_data: `warehouses_page:${clusterID}`,
    title: '🏭 Список складов кластера',
    page,
  });
};

const renderWarehouseFBOList = async (ctx: Context, clusterID: number, warehouseID: number, page = 1) => {
  const warehouses = await api.warehousesFBOList(String(warehouseID));
  if (!warehouses.length) return ctx.answerCbQuery('❌ Ошибка загрузки складов');

  try {
    await ctx.answerCbQuery();
  } catch {}

  await pagination<WarehouseSearchItem>({
    ctx,
    items: warehouses,
    itemsRender: (w) => ({
      text: `${w.name} | Тип: ${translateWarehouseFBOType(w.warehouse_type)}`,
      callback_data: `warehouses_detail:${clusterID}:${w.warehouse_id}`,
    }),
    callback_data: `warehouse_detail:${clusterID}:${warehouseID}`,
    title: '🏭 Список точек отгрузки поставки',
    page,
  });
};

const renderWarehouseFBODetail = async (ctx: Context, clusterID: number, warehouseID: number) => {
  const warehouses = await api.warehousesFBOList(String(warehouseID));
  const warehouse = warehouses.find((w) => w.warehouse_id === warehouseID);
  if (!warehouse) return ctx.answerCbQuery('❌ Ошибка загрузки склада');

  try {
    await ctx.answerCbQuery();
  } catch {}

  const text = `🏭 <b>${warehouse.name}</b>\n🆔 ID: <code>${warehouse.warehouse_id}</code>\n📍 Адрес: <code>${warehouse.address}</code>`;

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '❤️ Выбрать склад и принадлежащий ему кластер',
            callback_data: `select_warehouse:${clusterID}:${warehouse.warehouse_id}`,
          },
        ],
        [{ text: '🔙 Назад', callback_data: `warehouse_detail:${clusterID}:${warehouse.warehouse_id}` }],
      ],
    },
  });
};

export const setupWarehousesList = (bot: Telegraf) => {
  bot.action('clusters_list', (ctx) => renderClustersList(ctx, 1));
  bot.action(/^clusters_page:(\d+)$/, (ctx) => renderClustersList(ctx, Number(ctx.match[1])));

  bot.action(/^warehouses_page:(\d+)(?::(\d+))?$/, (ctx) => {
    const clusterID = ctx.match[1];
    const page = ctx.match[2] ? parseInt(ctx.match[2]) : 1;
    renderWarehousesList(ctx, clusterID, page);
  });

  bot.action(/^warehouse_detail:(\d+):(\d+)(?::(\d+))?$/, (ctx) => {
    const clusterID = Number(ctx.match[1]);
    const warehouseID = Number(ctx.match[2]);
    const page = ctx.match[3] ? parseInt(ctx.match[3]) : 1;
    renderWarehouseFBOList(ctx, clusterID, warehouseID, page);
  });

  bot.action(/^warehouses_detail:(\d+):(\d+)$/, (ctx) => {
    const clusterID = Number(ctx.match[1]);
    const warehouseID = Number(ctx.match[2]);
    renderWarehouseFBODetail(ctx, clusterID, warehouseID);
  });

  bot.action(/^select_warehouse:(\d+):(\d+)$/, (ctx) => {
    const clusterID = Number(ctx.match[1]);
    const warehouseID = Number(ctx.match[2]);
    const storage = singletonMonitoring.getStorage();
    storage.set('drop_off_point_warehouse_id', warehouseID);
    storage.set('cluster_ids', [String(clusterID)]);
    ctx.answerCbQuery('✅ Склад и кластер выбраны');

    if (storage.read().status) {
      singletonMonitoring.stopMonitoring();
      ctx.reply('⚠️ Мониторинг был остановлен из-за изменения данных');
    }
  });
};
