import { Telegraf } from 'telegraf';
import { setupCrossWarehousesList } from './cross-warehouses-list.js';

export const setupCrossWarehousesCommands = (bot: Telegraf) => {
  setupCrossWarehousesList(bot);
};
