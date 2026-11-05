/* eslint-disable no-console */
// Seeds a demo account through the PUBLIC API (the gateway), so it works locally and in production
// and never touches another service's database.
//
//   DEMO_EMAIL=demo@fintrack.app DEMO_PASSWORD='Choose-A-Password1' API_URL=http://localhost:8080 node scripts/seed.js
//
// Safe to run repeatedly: it skips creating transactions if the demo user already has some.

const API = (process.env.API_URL || 'http://localhost:8080').replace(/\/$/, '');
const EMAIL = process.env.DEMO_EMAIL;
const PASSWORD = process.env.DEMO_PASSWORD;
const NAME = process.env.DEMO_NAME || 'Demo User';
const THRESHOLD = Number(process.env.DEMO_THRESHOLD) || 10000;

if (!EMAIL || !PASSWORD) {
  console.error('Set DEMO_EMAIL and DEMO_PASSWORD (min 8 chars, with a letter and a number).');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, { body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(90000),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// Free hosting can take ~60s to wake up, so wait for the whole chain instead of failing fast.
async function waitForGateway() {
  for (let i = 1; i <= 15; i += 1) {
    try {
      const r = await call('GET', '/health/services');
      if (r.status === 200) return;
      console.log(`Waiting for services (attempt ${i}): ${JSON.stringify(r.json.services || r.json)}`);
    } catch (err) {
      console.log(`Waiting for gateway (attempt ${i}): ${err.message}`);
    }
    await sleep(5000);
  }
  throw new Error('Gateway or services did not become healthy in time');
}

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const Y = now.getUTCFullYear();
const M = now.getUTCMonth();
const TODAY = now.getUTCDate();

// monthOffset 0 = current month, -1 = last month ...; the current month never gets future dates.
function dateFor(monthOffset, day) {
  const first = new Date(Date.UTC(Y, M + monthOffset, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  let d = Math.min(day, lastDay);
  if (monthOffset === 0) d = Math.min(d, TODAY);
  return `${first.getUTCFullYear()}-${pad(first.getUTCMonth() + 1)}-${pad(d)}`;
}

const T = (monthOffset, day, type, category, amount, note) => ({ date: dateFor(monthOffset, day), type, category, amount, note });

const TRANSACTIONS = [
  // this month
  T(0, 1, 'income', 'Salary', 85000, 'Monthly salary'),
  T(0, 2, 'expense', 'Rent', 18000, 'Flat rent'),
  T(0, 3, 'expense', 'Food', 640, 'Lunch and coffee'),
  T(0, 4, 'expense', 'Transport', 320, 'Metro card recharge'),
  T(0, 4, 'expense', 'Bills', 2150, 'Electricity bill'),
  // last month
  T(-1, 1, 'income', 'Salary', 85000, 'Monthly salary'),
  T(-1, 12, 'income', 'Freelance', 22000, 'Website project'),
  T(-1, 27, 'income', 'Investments', 4200, 'Mutual fund dividend'),
  T(-1, 2, 'expense', 'Rent', 18000, 'Flat rent'),
  T(-1, 8, 'expense', 'Food', 3800, 'Groceries and dining out'),
  T(-1, 15, 'expense', 'Shopping', 12500, 'Headphones'),
  T(-1, 18, 'expense', 'Transport', 1450, 'Fuel and cabs'),
  T(-1, 20, 'expense', 'Bills', 2300, 'Internet and phone'),
  T(-1, 22, 'expense', 'Entertainment', 899, 'Movie night'),
  T(-1, 25, 'expense', 'Health', 1800, 'Pharmacy and checkup'),
  // two months ago
  T(-2, 1, 'income', 'Salary', 85000, 'Monthly salary'),
  T(-2, 14, 'income', 'Freelance', 15000, 'Logo design'),
  T(-2, 2, 'expense', 'Rent', 18000, 'Flat rent'),
  T(-2, 9, 'expense', 'Food', 4200, 'Groceries'),
  T(-2, 16, 'expense', 'Shopping', 6400, 'Clothes'),
  T(-2, 19, 'expense', 'Bills', 2100, 'Electricity bill'),
  T(-2, 23, 'expense', 'Entertainment', 1500, 'Concert tickets'),
  T(-2, 26, 'expense', 'Transport', 1280, 'Cabs'),
];

async function main() {
  console.log(`Seeding ${EMAIL} via ${API}`);
  await waitForGateway();

  const reg = await call('POST', '/api/auth/register', { body: { name: NAME, email: EMAIL, password: PASSWORD } });
  if (reg.status === 201) console.log('Created demo user');
  else if (reg.status === 409) console.log('Demo user already exists');
  else throw new Error(`Register failed (${reg.status}): ${JSON.stringify(reg.json)}`);

  const login = await call('POST', '/api/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  if (login.status !== 200) throw new Error(`Login failed (${login.status}): ${login.json.message || 'unknown error'} - is DEMO_PASSWORD correct?`);
  const token = login.json.data.accessToken;

  const existing = await call('GET', '/api/transactions?limit=1', { token });
  if (existing.json.data && existing.json.data.total > 0) {
    console.log(`Demo user already has ${existing.json.data.total} transactions, nothing to do.`);
    return;
  }

  const th = await call('PUT', '/api/settings/threshold', { token, body: { threshold: THRESHOLD } });
  if (th.status !== 200) throw new Error(`Setting threshold failed: ${JSON.stringify(th.json)}`);

  let created = 0;
  for (const tx of TRANSACTIONS) {
    const r = await call('POST', '/api/transactions', { token, body: tx });
    if (r.status !== 201) throw new Error(`Creating transaction failed (${r.status}): ${JSON.stringify(r.json)}`);
    created += 1;
  }
  console.log(`Created ${created} transactions across 3 months, alert limit set to ${THRESHOLD}.`);
  console.log('Expenses above the limit also create alerts through RabbitMQ (give it a few seconds).');
}

main().catch((err) => {
  console.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
