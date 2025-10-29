import { Telegraf } from 'telegraf';
import { setupTimeSlotList } from './time-slot-list.js';

export const setupTimeSlotCommands = (bot: Telegraf) => {
  setupTimeSlotList(bot);
};
