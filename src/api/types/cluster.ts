export type WarehouseType =
  | 'FULL_FILLMENT'
  | 'EXPRESS_DARK_STORE'
  | 'SORTING_CENTER'
  | 'ORDERS_RECEIVING_POINT'
  | 'CROSS_DOCK'
  | 'DISTRIBUTION_CENTER'

export interface Warehouse {
  name: string
  type: WarehouseType
  warehouse_id: number
}

export interface LogisticCluster {
  warehouses: Warehouse[]
}

export interface Cluster {
  id: number
  name: string
  type: 'CLUSTER_TYPE_OZON'
  logistic_clusters: LogisticCluster[]
}

export interface ClustersList {
  clusters: Cluster[]
}
