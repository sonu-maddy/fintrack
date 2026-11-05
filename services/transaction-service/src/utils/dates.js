// All month math is done in UTC on date-only values, so results never shift with server timezone.
const monthRange = (month) => {
  const [y, m] = month.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
};

const toMonthKey = (date) => date.toISOString().slice(0, 7);

const currentMonth = () => toMonthKey(new Date());

// Returns n month keys ending at `to` (inclusive), oldest first.
const lastMonths = (to, n) => {
  const [y, m] = to.split('-').map(Number);
  const keys = [];
  for (let i = n - 1; i >= 0; i -= 1) keys.push(toMonthKey(new Date(Date.UTC(y, m - 1 - i, 1))));
  return keys;
};

module.exports = { monthRange, toMonthKey, currentMonth, lastMonths };
