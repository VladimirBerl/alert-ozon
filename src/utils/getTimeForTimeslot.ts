export function getTimeForTimeslot(date_from: string, date_to: string) {
  const baseDate = new Date();

  // создаём копии даты, чтобы не портить исходную
  const dateFrom = new Date(baseDate);
  const dateTo = new Date(baseDate);

  // устанавливаем часы и минуты для начала
  const [fromHours, fromMinutes] = date_from.split(':').map(Number);
  dateFrom.setHours(fromHours, fromMinutes, 0, 0);

  // для конца прибавляем 27 дней
  dateTo.setDate(dateTo.getDate() + 27);
  const [toHours, toMinutes] = date_to.split(':').map(Number);
  dateTo.setHours(toHours, toMinutes, 0, 0);

  return {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  };
}
