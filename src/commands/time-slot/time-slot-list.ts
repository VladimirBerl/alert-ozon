import { Context, Telegraf } from 'telegraf';
import singletonMonitoring from '~/storage/draft-create.js';
import pagination from '~/utils/pagination.js';

const addBeforeZero = (value: string | number) => {
  const strValue = String(value);
  return strValue.length <= 1 ? `0${value}:00` : `${strValue}:00`;
};

const timeStep = new Array(24).fill(0).reduce((prev, _, index) => {
  return [
    ...prev,
    {
      text: `с ${addBeforeZero(index)} по ${addBeforeZero(index + 1)}`,
      value: `${addBeforeZero(index)}-${addBeforeZero(index + 1)}`,
    },
  ];
}, []);

const renderTimeSlotList = async (ctx: Context, page = 1) => {
  try {
    await ctx.answerCbQuery();
  } catch {}

  await pagination<{ text: string; value: string }>({
    ctx,
    items: timeStep,
    itemsRender: (t) => ({
      text: t.text,
      callback_data: `time_slot_select:${t.value}`,
    }),
    callback_data: 'time_slot_page',
    title: '🗓 Временные интервалы',
    page,
  });
};

export const setupTimeSlotList = (bot: Telegraf) => {
  bot.action('time_slot_list', (ctx) => renderTimeSlotList(ctx, 1));
  bot.action(/^time_slot_page:(\d+)$/, (ctx) => renderTimeSlotList(ctx, Number(ctx.match[1])));

  bot.action(/^time_slot_select:(.+)$/, async (ctx) => {
    const timeStep = ctx.match[1];
    const [date_from, date_to] = timeStep.split('-');
    const storage = singletonMonitoring.getStorage();

    storage.set('date_from', date_from);
    storage.set('date_to', date_to);

    await ctx.answerCbQuery('✅ Временной интервал успешно выбран');
    if (storage.read().status) {
      singletonMonitoring.stopMonitoring();
      ctx.reply('⚠️ Мониторинг был остановлен из-за изменения данных');
    }
  });
};
