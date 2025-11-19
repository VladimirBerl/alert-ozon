export function getTimeForTimeslotUTC(date_from: string, date_to: string) {
  const now = new Date();

  const [h1, m1] = date_from.split(':').map(Number);
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h1, m1, 0, 0);

  const [h2, m2] = date_to.split(':').map(Number);
  const dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 27, h2, m2, 0, 0);

  return {
    dateFromUTC: toUtcISOString(dateFrom),
    dateToUTC: toUtcISOString(dateTo),
  };
}

function toUtcISOString(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function extractTime(iso: string) {
  return iso.substring(11, 16);
}
