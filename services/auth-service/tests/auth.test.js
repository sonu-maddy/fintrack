process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-test-access-secret-123';
process.env.INTERNAL_TOKEN = 'test-internal-token';
process.env.BCRYPT_ROUNDS = '4';
process.env.LOGIN_MAX_ATTEMPTS = '1000';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let app;
let User;
let RefreshToken;

const call = (method, path) => request(app)[method](path).set('x-internal-token', process.env.INTERNAL_TOKEN);
const user = { name: 'Asha Verma', email: 'asha@example.com', password: 'Passw0rdOK' };
const cookieOf = (res) => (res.headers['set-cookie'] || []).find((c) => c.startsWith('refreshToken=')).split(';')[0];

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = require('../src/app');
  User = require('../src/models/User');
  RefreshToken = require('../src/models/RefreshToken');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
});

const registerAndLogin = async () => {
  await call('post', '/register').send(user);
  return call('post', '/login').send({ email: user.email, password: user.password });
};

describe('health', () => {
  it('returns service name and status without the internal token', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ service: 'auth-service', status: 'ok' });
  });
});

describe('registration', () => {
  it('registers a user and never returns the password hash', async () => {
    const res = await call('post', '/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ name: user.name, email: user.email });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|Passw0rdOK/);
  });

  it('rejects duplicate emails (case-insensitive)', async () => {
    await call('post', '/register').send(user);
    const res = await call('post', '/register').send({ ...user, email: 'ASHA@example.com' });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ success: false, error: { code: 'EMAIL_EXISTS' } });
    expect(res.body.requestId).toBeDefined();
  });

  it('validates input', async () => {
    const res = await call('post', '/register').send({ name: 'A', email: 'bad', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('stores a bcrypt hash, not the plaintext password', async () => {
    await call('post', '/register').send(user);
    const stored = await User.findOne({ email: user.email });
    expect(stored.passwordHash).not.toBe(user.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
  });
});

describe('login', () => {
  it('logs in and sets an HttpOnly refresh cookie', async () => {
    const res = await registerAndLogin();
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(JSON.stringify(res.body)).not.toMatch(/refreshToken/);
  });

  it('rejects an invalid password with a generic message', async () => {
    await call('post', '/register').send(user);
    const res = await call('post', '/login').send({ email: user.email, password: 'WrongPass1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown email with the same error', async () => {
    const res = await call('post', '/login').send({ email: 'nobody@example.com', password: 'Whatever1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('token refresh and logout', () => {
  it('rotates the refresh token and rejects reuse of the old one', async () => {
    const login = await registerAndLogin();
    const oldCookie = cookieOf(login);

    const refreshed = await call('post', '/refresh').set('Cookie', oldCookie);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toEqual(expect.any(String));
    const newCookie = cookieOf(refreshed);
    expect(newCookie).not.toBe(oldCookie);

    const reuse = await call('post', '/refresh').set('Cookie', oldCookie);
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('REFRESH_TOKEN_REUSED');

    // Reuse revokes the whole token family, so the new token stops working too.
    const afterReuse = await call('post', '/refresh').set('Cookie', newCookie);
    expect(afterReuse.status).toBe(401);
  });

  it('rejects refresh without a cookie', async () => {
    const res = await call('post', '/refresh');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NO_REFRESH_TOKEN');
  });

  it('logout revokes the refresh token', async () => {
    const login = await registerAndLogin();
    const cookie = cookieOf(login);
    const out = await call('post', '/logout').set('Cookie', cookie);
    expect(out.status).toBe(200);
    const res = await call('post', '/refresh').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});

describe('protected routes', () => {
  it('GET /me requires a valid access token', async () => {
    const none = await call('get', '/me');
    expect(none.status).toBe(401);
    const bad = await call('get', '/me').set('Authorization', 'Bearer not-a-token');
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('INVALID_TOKEN');
  });

  it('GET /me returns the current user', async () => {
    const login = await registerAndLogin();
    const res = await call('get', '/me').set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(user.email);
  });

  it('rejects requests that bypass the gateway (no internal token)', async () => {
    const res = await request(app).post('/login').send({ email: user.email, password: user.password });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED_INTERNAL');
  });
});
