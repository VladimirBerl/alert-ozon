import { Context, MiddlewareFn } from 'telegraf';
import { ADMINS } from '~/config/admins.js';

export const isAdmin: MiddlewareFn<Context> = async (ctx, next) => {
  const id = ctx.from?.id;
  if (!id || !ADMINS.includes(id)) return;
  await next();
};
