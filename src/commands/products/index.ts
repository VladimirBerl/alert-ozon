import { Telegraf } from 'telegraf';
import { setupProductsList } from './products-list.js';

export const setupProductsCommands = (bot: Telegraf) => {
  setupProductsList(bot);
};
