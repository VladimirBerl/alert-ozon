export type Warehouses = {
  result: Array<{
    warehouse: {
      id: string
      name: string
    }
    schedule: {
      date: string
      capacity: Array<{
        start: string
        end: string
        value: number
      }>
    }
  }>
}