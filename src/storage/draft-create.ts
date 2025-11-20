import api from '~/api/api.js';
import { AdminNotifier } from '~/utils/admin-notifier.js';
import { extractTime, getTimeForTimeslotUTC } from '~/utils/getTimeForTimeslot.js';
import JsonStorage from '~/utils/jsonStorage.js';
import { sleep } from '~/utils/util.js';

const notifier = new AdminNotifier();

interface draftCreateStorage {
  status: boolean;
  draft_id?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  cluster_ids?: string | null;
  drop_off_point_warehouse_id?: number | null;
  drop_off_point_cluster_id?: number | null;
  items:
    | {
        quantity: number;
        sku: number;
      }[]
    | [];
  type: 'CREATE_TYPE_CROSSDOCK';
}

interface ValidationResultSuccess {
  valid: true;
  state: {
    cluster: string;
    warehouse: string;
    timeSlot: string;
    products: string[];
  };
}

interface ValidationResultError {
  valid: false;
  errors: string[];
}

type ValidationResult = ValidationResultSuccess | ValidationResultError;

export class Monitoring {
  private storage = new JsonStorage<draftCreateStorage>('draft-create.json');
  private static instance: Monitoring | null = null;
  private intervalDraft: NodeJS.Timeout | null = null;
  private intervalTimeslot: NodeJS.Timeout | null = null;

  constructor() {
    this.storage.write({
      status: false,
      draft_id: null,
      date_from: null,
      date_to: null,
      cluster_ids: null,
      drop_off_point_warehouse_id: null,
      drop_off_point_cluster_id: null,
      items: [],
      type: 'CREATE_TYPE_CROSSDOCK',
    });
  }

  static getInstance(): Monitoring {
    if (!Monitoring.instance) {
      return (Monitoring.instance = new Monitoring());
    }
    return Monitoring.instance;
  }

  public getStorage(): JsonStorage<draftCreateStorage> {
    return this.storage;
  }

  public async getCurrentMonitoringState(): Promise<ValidationResult> {
    const { cluster_ids, items, date_from, date_to, drop_off_point_warehouse_id, drop_off_point_cluster_id } =
      this.storage.read();
    const errors: string[] = [];

    if (!cluster_ids) errors.push('❌ Не выбран кластер');
    if (!drop_off_point_warehouse_id) errors.push('❌ Не выбран склад');
    if (!date_from || !date_to) errors.push('❌ Не выбран временной интервал');
    if (!items.length) errors.push('❌ Не добавлены товары');
    if (!drop_off_point_cluster_id) errors.push('❌ Не выбран кластер для кроссдок склада');

    if (errors.length) return { valid: false, errors };

    try {
      const cluster = await api
        .clustersList()
        .then((clusters) => clusters.find((c) => c.id === Number(cluster_ids)));

      if (!cluster) {
        errors.push('❌ Не удалось найти кластер приема товара. Выберите его заново.');
        return { valid: false, errors };
      }

      const clusterCross = await api
        .searchClusters([String(drop_off_point_cluster_id)])
        .then((clusters) => clusters.find((c) => c.id === Number(drop_off_point_cluster_id)));

      if (!clusterCross) {
        errors.push('❌ Не удалось найти кластер кроссдок склада. Выберите его заново.');
        return { valid: false, errors };
      }

      const warehouse = clusterCross.logistic_clusters
        .flatMap((l) => l.warehouses)
        .find((w) => w.warehouse_id === drop_off_point_warehouse_id);

      if (!warehouse) {
        errors.push('❌ Не удалось найти склад. Выберите его заново.');
        return { valid: false, errors };
      }

      const products = await api.searchProduct(items.map((i) => String(i.sku)));
      if (!products?.length) {
        errors.push('❌ Не удалось найти товары.');
        return { valid: false, errors };
      }

      return {
        valid: true,
        state: {
          cluster: `${cluster.name} | ${cluster.id}`,
          warehouse: `${warehouse.name} | ${warehouse.warehouse_id}`,
          timeSlot: `${date_from} - ${date_to}`,
          products: products.map((p, i) => {
            const quantity = items.find((i) => i.sku === p.sku)?.quantity || 0;
            return `${i + 1}. ${p.name} | ${p.sku} | штук: ${quantity}`;
          }),
        },
      };
    } catch (e) {
      return {
        valid: false,
        errors: ['⚠️ Ошибка при проверке данных: ' + String(e)],
      };
    }
  }

  public async startMonitoring() {
    try {
      const validation = this.validateStorageBeforeStart();

      if (!validation.valid) {
        console.warn('Ошибка валидации мониторинга:', validation.errors);
        return validation.errors;
      }

      if (this.intervalDraft || this.intervalTimeslot) {
        return ['⚠️ Мониторинг уже запущен!'];
      }

      this.storage.set('status', true);

      this.startIntervalDraft();
      this.startIntervalTimeslot();

      console.log('✅ Мониторинг запущен');
    } catch (error) {
      console.error('Ошибка при запуске мониторинга:', error);
      return ['❌ Не удалось запустить мониторинг.\n\n<code>' + String(error) + '</code>'];
    }
  }

  public stopMonitoring() {
    if (this.intervalDraft) {
      clearInterval(this.intervalDraft);
      this.intervalDraft = null;
    }
    if (this.intervalTimeslot) {
      clearInterval(this.intervalTimeslot);
      this.intervalTimeslot = null;
    }
    this.storage.write({ ...this.storage.read(), status: false });
  }

  private async startIntervalDraft() {
    if (this.intervalDraft) {
      clearInterval(this.intervalDraft);
      this.intervalDraft = null;
    }

    console.log('🟢 Интервал Draft запущен');

    await this.createDraft();

    this.intervalDraft = setInterval(async () => {
      await this.createDraft();
    }, 60_000 * 25);
  }

  private async createDraft() {
    try {
      const { cluster_ids, drop_off_point_warehouse_id, items, status } = this.storage.read();

      if (!status) return;
      if (!cluster_ids || !drop_off_point_warehouse_id || !items?.length) return;

      const draft = await api.draftCreateInfo(
        [String(cluster_ids)],
        Number(drop_off_point_warehouse_id),
        items
      );

      if (!draft) return;

      this.storage.set('draft_id', draft.draft_id);
      console.log(`✅ Черновик создан: ${JSON.stringify(draft, null, 2)}}`);
    } catch (error) {
      console.error('❌ Ошибка при создании черновика:', error);
    }
  }

  private startIntervalTimeslot() {
    if (this.intervalTimeslot) {
      clearInterval(this.intervalTimeslot);
      this.intervalTimeslot = null;
    }
    console.log('🟢 Интервал Timeslot запущен');

    this.intervalTimeslot = setInterval(async () => {
      try {
        const { draft_id, date_from, date_to, drop_off_point_warehouse_id, cluster_ids, status } =
          this.storage.read();

        if (!draft_id || !date_from || !date_to || !drop_off_point_warehouse_id || !status || !cluster_ids) {
          return console.log(
            `⚠️ Не удалось получить данные для проверки тайм-слота: ${JSON.stringify(
              this.storage.read(),
              null,
              2
            )}}`
          );
        }

        console.log('⏰ Проверка таймслотов...');

        const fullFillmentWarehousesID = await api.draftFullfillmentWarehouseInfo(Number(cluster_ids));
        if (!fullFillmentWarehousesID) return console.log('⚠️ Доступных складов нет');

        const { dateFromUTC, dateToUTC } = getTimeForTimeslotUTC(date_from, date_to);

        const targetFromTime = extractTime(dateFromUTC);
        const targetToTime = extractTime(dateToUTC);

        let matched = null;
        let correctWarehouseId = null;

        for (const warehouseId of fullFillmentWarehousesID) {
          const info = await api.draftTimeslotInfo(dateFromUTC, dateToUTC, Number(draft_id), [
            String(warehouseId),
          ]);

          const found = info?.drop_off_warehouse_timeslots
            .flatMap((w) => w.days?.flatMap((d) => d.timeslots) || [])
            .find(
              (slot) =>
                extractTime(slot.from_in_timezone) === targetFromTime &&
                extractTime(slot.to_in_timezone) === targetToTime
            );

          if (found) {
            matched = found;
            correctWarehouseId = warehouseId;
            break;
          }

          await sleep(2000);
        }

        if (!matched) {
          return console.log('⚠️ Доступных таймслотов нет');
        }

        const result = await api.draftSupplyCreate(
          Number(draft_id),
          {
            from_in_timezone: matched.from_in_timezone,
            to_in_timezone: matched.to_in_timezone,
          },
          Number(correctWarehouseId)
        );

        if (!result) return;

        this.stopMonitoring();
        await notifier.notifyDraftCreated(result.operation_id, Number(draft_id), {
          from_in_timezone: matched.from_in_timezone,
          to_in_timezone: matched.to_in_timezone,
        });
      } catch (error) {
        console.error('❌ Ошибка при проверке таймслота:', error);
      }
    }, 30_000);
  }

  private validateStorageBeforeStart(): { valid: boolean; errors?: string[] } {
    const { cluster_ids, items, date_from, date_to, drop_off_point_warehouse_id, status } =
      this.storage.read();

    const errors: string[] = [];

    if (!cluster_ids) errors.push('❌ Не указан кластер');
    if (!drop_off_point_warehouse_id) errors.push('❌ Не выбран склад');
    if (!date_from || !date_to) errors.push('❌ Не выбран временной интервал');
    if (!items?.length) errors.push('❌ Не добавлены товары');
    if (status) errors.push('⚠️ Мониторинг уже активен');

    return errors.length ? { valid: false, errors } : { valid: true };
  }
}

const singletonMonitoring = Monitoring.getInstance();

export default singletonMonitoring;
