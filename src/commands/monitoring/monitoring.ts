import { Telegraf } from 'telegraf';
import singletonMonitoring from '~/storage/draft-create.js';

export const setupMonitoring = (bot: Telegraf) => {
  bot.action('root_start_monitoring', async (ctx) => {
    const validation = await singletonMonitoring.getCurrentMonitoringState();
    await ctx.answerCbQuery();

    if (!validation.valid) {
      const errorText =
        '⚠️ *Ошибки при проверке конфигурации:*\n\n' +
        validation.errors.map((e, i) => `${i + 1}. ${e}`).join('\n');
      return ctx.reply(errorText, { parse_mode: 'Markdown' });
    }

    const { cluster, warehouse, timeSlot, products } = validation.state;

    const text =
      `✅ Вы собираетесь запустить мониторинг со следующей конфигурацией:\n\n` +
      `📦 Конечный склад: ${cluster}\n` +
      `🏭 Склад: ${warehouse}\n` +
      `⏰ Временной интервал: ${timeSlot}\n\n` +
      `🧾 Товары:\n${products.join('\n')}`;

    return ctx.reply(text, {
      reply_markup: {
        inline_keyboard: [[{ text: '🚀 Запустить мониторинг', callback_data: 'monitoring_start' }]],
      },
    });
  });

  bot.action('monitoring_start', async (ctx) => {
    await ctx.answerCbQuery();

    try {
      const monitoring = singletonMonitoring;
      const storage = monitoring.getStorage().read();
      if (storage.status) return ctx.reply('⚠️ Мониторинг уже активен');
      if (!storage.cluster_ids || !storage.drop_off_point_warehouse_id || !storage.items.length) {
        return ctx.reply('⚠️ Невозможно запустить: отсутствуют обязательные данные.');
      }

      monitoring.startMonitoring();
      await ctx.reply('🚀 Мониторинг успешно запущен!', { parse_mode: 'HTML' });
    } catch (err) {
      console.error('Ошибка при запуске мониторинга:', err);
      await ctx.reply('❌ Произошла ошибка при запуске мониторинга.');
    }
  });

  bot.action('root_stop_monitoring', async (ctx) => {
    await ctx.answerCbQuery();
    const state = singletonMonitoring.getStorage().read();

    if (!state.status) return ctx.reply('❌ Мониторинг не запущен!');

    return ctx.reply('Вы собираетесь остановить мониторинг. Подтвердите действие.', {
      reply_markup: {
        inline_keyboard: [[{ text: '✅ Подтвердить', callback_data: 'monitoring_stop' }]],
      },
    });
  });

  bot.action('monitoring_stop', async (ctx) => {
    await ctx.answerCbQuery();
    const state = singletonMonitoring.getStorage().read();

    if (!state.status) return ctx.reply('❌ Мониторинг не запущен!');

    singletonMonitoring.stopMonitoring();
    return ctx.reply('✅ Мониторинг успешно остановлен!', { parse_mode: 'HTML' });
  });
};
