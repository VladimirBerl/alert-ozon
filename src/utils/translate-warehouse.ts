import { WarehouseFBOType, WarehouseType } from '~/api/types/index.js';

export function translateWarehouseType(type: WarehouseType): string {
  const translations = {
    FULL_FILLMENT: 'фулфилмент',
    EXPRESS_DARK_STORE: 'даркстор',
    SORTING_CENTER: 'сортировочный центр',
    ORDERS_RECEIVING_POINT: 'пункт приёма заказов',
    CROSS_DOCK: 'кросс-докинг',
    DISTRIBUTION_CENTER: 'распределительный центр',
  };

  return translations[type];
}

export function translateWarehouseFBOType(type: WarehouseFBOType): string {
  const translations = {
    WAREHOUSE_TYPE_DELIVERY_POINT: 'пункт выдачи заказов',
    WAREHOUSE_TYPE_ORDERS_RECEIVING_POINT: 'пункт приёма заказов',
    WAREHOUSE_TYPE_SORTING_CENTER: 'сортировочный центр',
    WAREHOUSE_TYPE_FULL_FILLMENT: 'фулфилмент',
    WAREHOUSE_TYPE_CROSS_DOCK: 'кросс-докинг',
  };

  return translations[type];
}
