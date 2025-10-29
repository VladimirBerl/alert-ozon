import { Telegraf } from 'telegraf';
import { setupMonitoring } from './monitoring.js';

export const setupMonitoringCommands = (bot: Telegraf) => {
  setupMonitoring(bot);
};
