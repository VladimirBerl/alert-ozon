import { Context } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/types';

interface Pagination<T> {
  ctx: Context;
  items: T[];
  itemsRender: (item: T) => InlineKeyboardButton;
  page?: number;
  pageSize?: number;
  callback_data: string;
  title: string;
}

export default async function pagination<T>({
  ctx,
  items,
  itemsRender,
  page = 1,
  pageSize = 5,
  callback_data,
  title,
}: Pagination<T>) {
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  const inline_keyboard = pageItems.map((w) => [itemsRender(w)]);

  const navRow: any[] = [];
  if (page > 1) navRow.push({ text: '⬅️ Назад', callback_data: `${callback_data}:${page - 1}` });
  if (start + pageSize < items.length)
    navRow.push({ text: '➡️ Вперёд', callback_data: `${callback_data}:${page + 1}` });
  if (navRow.length) inline_keyboard.push(navRow);
  inline_keyboard.push([{ text: '🔙 В меню', callback_data: 'main_menu' }]);

  await ctx.editMessageText(`${title} (стр. ${page}):`, { reply_markup: { inline_keyboard } });
}
