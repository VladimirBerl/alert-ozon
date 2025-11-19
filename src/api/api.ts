import axios from 'axios';
import { API_URL, OZON_API_KEY, OZON_CLIENT_ID } from '~/const.js';
import {
  ClustersList,
  WarehouseSearch,
  ProductsResult,
  ProductInfoListResponse,
  ProductItemInfo,
  DraftInfoResponse,
  DropOffWarehouseTimeslotsResponse,
} from './types/index.js';
import { setupCache } from 'axios-cache-interceptor';
import { AdminNotifier } from '~/utils/admin-notifier.js';

const notifier = new AdminNotifier();

const apiInstance = setupCache(
  axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': OZON_CLIENT_ID,
      'Api-Key': OZON_API_KEY,
    },
  })
);

const api = {
  clustersList: async () => {
    try {
      return await apiInstance
        .post<ClustersList>('/v1/cluster/list', {
          cluster_type: 'CLUSTER_TYPE_OZON',
          caches: false,
        })
        .then((res) => res.data.clusters);
    } catch (error) {
      handleAxiosError(error, 'clustersList');
      return [];
    }
  },
  searchClusters: async (cluster_ids: string[]) => {
    try {
      return await apiInstance
        .post<ClustersList>('/v1/cluster/list', {
          cluster_ids,
          cluster_type: 'CLUSTER_TYPE_OZON',
          caches: false,
        })
        .then((res) => res.data.clusters);
    } catch (error) {
      handleAxiosError(error, 'searchClusters');
      return [];
    }
  },
  draftFullfillmentWarehouseInfo: async (cluster_id: number) => {
    try {
      return await apiInstance
        .post<ClustersList>('/v1/cluster/list', {
          cluster_ids: [cluster_id],
          cluster_type: 'CLUSTER_TYPE_OZON',
          caches: false,
        })
        .then((res) =>
          res.data.clusters
            .find((c) => c.id === Number(cluster_id))
            ?.logistic_clusters.flatMap((l) => l.warehouses)
            .filter((w) => w.type === 'FULL_FILLMENT')
            .map((w) => w.warehouse_id)
        );
    } catch (error) {
      handleAxiosError(error, 'searchClusters');
      return [];
    }
  },
  warehousesFBOList: async (search: string) => {
    try {
      return await apiInstance
        .post<WarehouseSearch>('/v1/warehouse/fbo/list', {
          filter_by_supply_type: ['CREATE_TYPE_CROSSDOCK'],
          search,
          caches: false,
        })
        .then((res) => res.data.search);
    } catch (error) {
      handleAxiosError(error, 'warehousesFBOList');
      return [];
    }
  },
  productList: async () => {
    try {
      const products = await apiInstance
        .post<ProductsResult>('/v3/product/list', {
          filter: {
            visibility: 'ALL',
          },
          last_id: '',
          limit: 1000,
          caches: { ttl: 15 * 60 * 1000 },
        })
        .then((res) => res.data.result);

      const productsIds = products.items.map((p) => String(p.product_id));

      return await apiInstance
        .post<ProductInfoListResponse>('/v3/product/info/list', {
          product_id: productsIds,
        })
        .then((res) => res.data.items);
    } catch (error) {
      handleAxiosError(error, 'productList');
      return [];
    }
  },
  searchProduct: async (sku: string[]) => {
    return await apiInstance
      .post<ProductInfoListResponse>('/v3/product/info/list', {
        sku,
        caches: false,
      })
      .then((res) => res.data.items as ProductItemInfo[] | undefined);
  },
  draftCreate: async (
    cluster_ids: string[],
    drop_off_point_warehouse_id: number,
    items: { quantity: number; sku: number }[]
  ) => {
    const maxRetries = 3;
    const baseDelay = 30_000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { operation_id } = await apiInstance
          .post<{ operation_id: string }>('/v1/draft/create', {
            cluster_ids,
            drop_off_point_warehouse_id,
            items,
            type: 'CREATE_TYPE_CROSSDOCK',
            caches: false,
          })
          .then((res) => res.data);

        if (!operation_id) {
          throw new Error('Не удалось получить operation_id при создании драфта');
        }

        console.log(`✅ Черновик создан успешно (operation_id: ${operation_id})`);
        return operation_id;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          console.warn(`⚠️ Превышен лимит запросов (попытка ${attempt}/${maxRetries})`);

          if (attempt === maxRetries) {
            await notifier.notifyRateLimitExceeded(
              `Превышен лимит создания черновиков. Последний ответ: ${
                error.response?.data?.message ?? '429 Too Many Requests'
              }`
            );
            return null;
          }

          const delayMs = baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Повтор через ${delayMs / 1000} секунд...`);
          await delay(delayMs);
        } else {
          console.error('❌ Ошибка при создании драфта:', error);
          return null;
        }
      }
    }

    return null;
  },
  draftCreateInfo: async (
    cluster_ids: string[],
    drop_off_point_warehouse_id: number,
    items: { quantity: number; sku: number }[]
  ) => {
    try {
      const operation_id = await api.draftCreate(cluster_ids, drop_off_point_warehouse_id, items);

      if (!operation_id) return null;

      let attempt = 0;
      const maxAttempts = 5;
      const delay = 5000;

      while (attempt < maxAttempts) {
        attempt++;

        const createDraftInfo = await apiInstance
          .post<DraftInfoResponse>('/v1/draft/create/info', {
            operation_id,
            caches: false,
          })
          .then((res) => res.data);

        console.log(`🔁 Попытка ${attempt}: статус = ${createDraftInfo.status}`);

        if (createDraftInfo.status == 'CALCULATION_STATUS_SUCCESS') {
          console.log(`✅ Расчёт завершён: ${createDraftInfo.status}`);
          return createDraftInfo;
        }

        if (attempt < maxAttempts) {
          console.log(`⏳ Ожидаем ${delay / 1000} сек перед следующей проверкой...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      handleAxiosError(error, 'draftCreate');
      return null;
    }
  },
  draftTimeslotInfo: async (
    date_from: string,
    date_to: string,
    draft_id: number,
    warehouse_ids: string[]
  ) => {
    try {
      return await apiInstance
        .post<DropOffWarehouseTimeslotsResponse>('/v1/draft/timeslot/info', {
          date_from,
          date_to,
          draft_id,
          warehouse_ids,
          caches: false,
        })
        .then((res) => res.data);
    } catch (error) {
      handleAxiosError(error, 'draftTimeslotInfo');
      return null;
    }
  },
  draftSupplyCreate: async (
    draft_id: number,
    timeslot: { from_in_timezone: string; to_in_timezone: string },
    warehouse_id: number
  ) => {
    try {
      return await apiInstance
        .post<{
          operation_id: string;
        }>('/v1/draft/supply/create', {
          draft_id,
          timeslot,
          warehouse_id,
          caches: false,
        })
        .then((res) => res.data);
    } catch (error) {
      handleAxiosError(error, 'draftSupplyCreate');
      return null;
    }
  },
};

function handleAxiosError(error: unknown, context?: string) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const statusText = error.response?.statusText || 'Unknown status';
    const message = error.response?.data?.message || error.message;
    const url = error.config?.url;

    console.error(
      `❌ AxiosError${context ? ` (${context})` : ''}:\n` +
        `➡️ URL: ${url}\n` +
        `➡️ Статус: ${status} (${statusText})\n` +
        `➡️ Сообщение: ${message}`
    );
  } else {
    console.error(`❌ Неизвестная ошибка${context ? ` (${context})` : ''}:`, error);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default api;
