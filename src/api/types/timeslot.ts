export interface DropOffWarehouseTimeslotsResponse {
  /** Список складов с доступными таймслотами */
  drop_off_warehouse_timeslots: DropOffWarehouseTimeslot[];
  /** Дата начала запрошенного диапазона */
  requested_date_from: string; // ISO 8601 (пример: "2019-08-24T14:15:22Z")
  /** Дата конца запрошенного диапазона */
  requested_date_to: string;   // ISO 8601
}

export interface DropOffWarehouseTimeslot {
  /** Текущая дата/время в часовом поясе склада */
  current_time_in_timezone: string;
  /** Таймслоты, сгруппированные по дням */
  days: DropOffWarehouseDay[];
  /** ID склада */
  drop_off_warehouse_id: number;
  /** Таймзона склада, например "Europe/Moscow" */
  warehouse_timezone: string;
}

export interface DropOffWarehouseDay {
  /** Дата дня (начало дня в часовом поясе склада) */
  date_in_timezone: string;
  /** Доступные интервалы времени для этого дня */
  timeslots: DropOffWarehouseTimeslotInterval[];
}

export interface DropOffWarehouseTimeslotInterval {
  /** Начало интервала в часовом поясе склада */
  from_in_timezone: string;
  /** Конец интервала в часовом поясе склада */
  to_in_timezone: string;
}
