export interface Quant {
  quant_code: string;
  quant_size: number;
}

export interface ProductItem {
  archived: boolean;
  has_fbo_stocks: boolean;
  has_fbs_stocks: boolean;
  is_discounted: boolean;
  offer_id: string;
  product_id: number;
  quants: Quant[];
}

export interface ProductsResult {
  result: {
    items: ProductItem[];
    total: number;
    last_id: string;
  };
}

export interface ProductInfoListResponse {
  items: ProductItemInfo[];
}

export interface ProductItemInfo {
  availabilities: Availability[];
  barcodes: string[];
  color_image: string[];
  commissions: Commission[];
  created_at: string;
  currency_code: string;
  description_category_id: number;
  discounted_fbo_stocks: number;
  errors: ErrorItem[];
  has_discounted_fbo_item: boolean;
  id: number;
  images: string[];
  images360: string[];
  is_archived: boolean;
  is_autoarchived: boolean;
  is_discounted: boolean;
  is_kgt: boolean;
  is_prepayment_allowed: boolean;
  is_super: boolean;
  marketing_price: string;
  min_price: string;
  model_info: ModelInfo;
  name: string;
  offer_id: string;
  old_price: string;
  price: string;
  price_indexes: PriceIndexes;
  primary_image: string[];
  promotions: Promotion[];
  sku: number;
  sources: Source[];
  statuses: Statuses;
  stocks: Stocks;
  type_id: number;
  updated_at: string;
  vat: string;
  visibility_details: VisibilityDetails;
  volume_weight: number;
}

export interface Availability {
  availability: string;
  reasons: Reason[];
  sku: number;
  source: string;
}

export interface Reason {
  human_text: {
    text: string;
  };
  id: number;
}

export interface Commission {
  delivery_amount: number;
  percent: number;
  return_amount: number;
  sale_schema: string;
  value: number;
}

export interface ErrorItem {
  attribute_id: number;
  code: string;
  field: string;
  level: string;
  state: string;
  texts: ErrorTexts;
}

export interface ErrorTexts {
  attribute_name: string;
  description: string;
  hint_code: string;
  message: string;
  params: Param[];
  short_description: string;
}

export interface Param {
  name: string;
  value: string;
}

export interface ModelInfo {
  count: number;
  model_id: number;
}

export interface PriceIndexes {
  color_index: string;
  external_index_data: PriceIndexData;
  ozon_index_data: PriceIndexData;
  self_marketplaces_index_data: PriceIndexData;
}

export interface PriceIndexData {
  minimal_price: string;
  minimal_price_currency: string;
  price_index_value: number;
}

export interface Promotion {
  is_enabled: boolean;
  type: string;
}

export interface Source {
  created_at: string;
  quant_code: string;
  shipment_type: string;
  sku: number;
  source: string;
}

export interface Statuses {
  is_created: boolean;
  moderate_status: string;
  status: string;
  status_description: string;
  status_failed: string;
  status_name: string;
  status_tooltip: string;
  status_updated_at: string;
  validation_status: string;
}

export interface Stocks {
  has_stock: boolean;
  stocks: Stock[];
}

export interface Stock {
  present: number;
  reserved: number;
  sku: number;
  source: string;
}

export interface VisibilityDetails {
  has_price: boolean;
  has_stock: boolean;
}
