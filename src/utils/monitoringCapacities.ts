import { Telegraf } from 'telegraf';
import api from '~/api/api.js';
import JsonStorage from '~/utils/jsonStorage.js';

type FavoriteWarehouse = { id: string; name: string; capacities?: number };

export default class MonitoringService {
  private static instances = new Map<number, MonitoringService>();
  private intervalId?: NodeJS.Timeout;
  private storage = new JsonStorage<FavoriteWarehouse>('warehouses_monitoring.json');
  private storageFavorites = new JsonStorage<FavoriteWarehouse>('warehouses.json');

  private constructor(private bot: Telegraf, private chatId: number) {}

  public static getInstance(bot: Telegraf, chatId: number) {
    if (!chatId) throw new Error('Chat ID is required');
    if (!MonitoringService.instances.has(chatId)) {
      MonitoringService.instances.set(chatId, new MonitoringService(bot, chatId));
    }
    return MonitoringService.instances.get(chatId)!;
  }

  public start(intervalMs = 60_000): boolean {
    if (this.intervalId) return false;
    this.storage.removeAll();
    this.storage.write(this.storageFavorites.read());
    this.intervalId = setInterval(() => this.checkWarehouses(), intervalMs);
    return true;
  }

  public stop(): boolean {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.storage.removeAll();
      this.intervalId = undefined;
      return true;
    }
    return false;
  }

  addMonitoring(fn: (el: FavoriteWarehouse) => boolean, item: FavoriteWarehouse): boolean {
    return this.storage.addIn(fn, item);
  }

  removeMonitoring(fn: (el: FavoriteWarehouse) => boolean): boolean {
    return this.storage.removeIn(fn);
  }

  private async checkWarehouses() {
    try {
      const favorites = this.storage.read();
      const warehouses = await api.getAvailableWarehouses();

      for (const fav of favorites) {
        const warehouse = warehouses.find((w) => w.warehouse.id === fav.id);
        if (!warehouse) continue;

        const capacity = warehouse.schedule.capacity.find((c) => c.value > 0) || null;
        if (capacity) {
          await this.bot.telegram.sendMessage(
            this.chatId,
            `📦 Склад <b>${fav.name}</b> достиг вместимости: ${fav.capacities}! 📅 ${new Date(
              capacity.start
            ).toLocaleDateString()}–${new Date(
              capacity.end
            ).toLocaleDateString()}: <b>${capacity.value.toLocaleString()}</b>`,
            { parse_mode: 'HTML' }
          );
        }
      }
    } catch (err) {
      console.error('Ошибка мониторинга складов:', err);
    }
  }
}
