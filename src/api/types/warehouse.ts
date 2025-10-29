export type WarehouseFBOType =
  | 'WAREHOUSE_TYPE_DELIVERY_POINT'
  | 'WAREHOUSE_TYPE_ORDERS_RECEIVING_POINT'
  | 'WAREHOUSE_TYPE_SORTING_CENTER'
  | 'WAREHOUSE_TYPE_FULL_FILLMENT'
  | 'WAREHOUSE_TYPE_CROSS_DOCK';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface WarehouseSearchItem {
  address: string;
  coordinates: Coordinates;
  name: string;
  warehouse_id: number;
  warehouse_type: WarehouseFBOType;
}

export interface WarehouseSearch {
  search: WarehouseSearchItem[];
}
