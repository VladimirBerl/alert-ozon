import { Telegraf } from 'telegraf';
import { setupWarehousesList } from './warehouses-list.js';
import { setupWarehousesFavorite } from './warehouses-favorites.js';

export const setupWarehousesCommands = (bot: Telegraf) => {
  setupWarehousesList(bot);
  setupWarehousesFavorite(bot);
};
