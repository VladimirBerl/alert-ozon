import { Telegraf } from 'telegraf';
import { setupWarehousesList } from './warehouses-list.js';

export const setupWarehousesCommands = (bot: Telegraf) => {
  setupWarehousesList(bot);
};
