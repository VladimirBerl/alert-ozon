import axios from 'axios';
import { API_URL, OZON_API_KEY, OZON_CLIENT_ID } from '~/const.js';
import { Warehouses } from './types.js';

const apiInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Client-Id': OZON_CLIENT_ID,
    'Api-Key': OZON_API_KEY,
  },
});

const api = {
  getAvailableWarehouses: async () => {
    const res = await apiInstance.get<Warehouses>('/v1/supplier/available_warehouses');
    return res.data.result ?? [];
  },
};

export default api;
