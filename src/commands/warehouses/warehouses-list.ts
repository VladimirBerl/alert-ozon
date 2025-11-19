import { Context, Telegraf } from 'telegraf';
import api from '~/api/api.js';
import { Cluster } from '~/api/types/index.js';
import singletonMonitoring from '~/storage/draft-create.js';
import pagination from '~/utils/pagination.js';

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

export const setupWarehousesList = (bot: Telegraf) => {
  bot.action('clusters_list', (ctx) => renderClustersList(ctx, 1));
  bot.action(/^clusters_page:(\d+)$/, (ctx) => renderClustersList(ctx, Number(ctx.match[1])));

  bot.action(/^warehouses_page:(\d+)(?::(\d+))?$/, (ctx) => {
    const clusterID = ctx.match[1];

    const storage = singletonMonitoring.getStorage();
    storage.set('cluster_ids', [String(clusterID)]);
    ctx.answerCbQuery('✅ Кластер выбран');

    if (storage.read().status) {
      singletonMonitoring.stopMonitoring();
      ctx.reply('⚠️ Мониторинг был остановлен из-за изменения данных');
    }
  });
};
