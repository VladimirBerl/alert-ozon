export interface DraftInfoResponse {
  clusters: DraftCluster[];
  draft_id: number;
  errors: DraftError[];
  status: DraftCalculationStatus;
}

export interface DraftCluster {
  cluster_id: number;
  cluster_name: string;
  warehouses: DraftWarehouse[];
}

export interface DraftWarehouse {
  bundle_ids: DraftBundle[];
  restricted_bundle_id: string;
  status: DraftWarehouseStatus;
  supply_warehouse: DraftSupplyWarehouse;
  total_rank: number;
  total_score: number;
  travel_time_days: number;
}

export interface DraftBundle {
  bundle_id: string;
  is_docless: boolean;
}

export interface DraftWarehouseStatus {
  invalid_reason: string; // пример: "WAREHOUSE_SCORING_INVALID_REASON_UNSPECIFIED"
  is_available: boolean;
  state: string; // пример: "WAREHOUSE_SCORING_STATUS_FULL_AVAILABLE"
}

export interface DraftSupplyWarehouse {
  address: string;
  name: string;
  warehouse_id: number;
}

export interface DraftError {
  error_message: string;
  items_validation: DraftItemValidation[];
  unknown_cluster_ids: string[];
}

export interface DraftItemValidation {
  reasons: string[];
  sku: number;
}

export type DraftCalculationStatus =
  | 'CALCULATION_STATUS_FAILED'
  | 'CALCULATION_STATUS_SUCCESS'
  | 'CALCULATION_STATUS_PENDING'
  | 'CALCULATION_STATUS_UNKNOWN';
