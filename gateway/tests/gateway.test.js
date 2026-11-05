process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-test-access-secret-123';
process.env.INTERNAL_TOKEN = 'test-internal-token';
process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:1';
process.env.TRANSACTION_SERVICE_URL = 'http://127.0.0.1:1';
process.env.NOTIFICATION_SERVICE_URL = 'http://127.0.0.1:1';
process.env.CORS_ORIGINS = 'http://allowed.example';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

describe('gateway', () => {
  it('serves /health and a request id header', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ service: 'gateway', status: 'ok' });
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('keeps a valid incoming request id', async () => {
    const res = await request(app).get('/health').set('x-request-id', 'abc-12345678');
    expect(res.headers['x-request-id']).toBe('abc-12345678');
  });

  it('rejects protected routes without a token using the standard error format', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    expect(res.body.requestId).toBeDefined();
  });

  it('rejects a forged token', async () => {
    const forged = jwt.sign({}, 'some-other-secret-some-other-secret-1', { subject: 'u1' });
    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 502 when a downstream service is unreachable', async () => {
    const token = jwt.sign({}, process.env.JWT_ACCESS_SECRET, { subject: 'u1', expiresIn: '5m' });
    const res = await request(app).get('/api/transactions').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('only allows configured CORS origins', async () => {
    const ok = await request(app).get('/health').set('Origin', 'http://allowed.example');
    expect(ok.headers['access-control-allow-origin']).toBe('http://allowed.example');
    const bad = await request(app).get('/health').set('Origin', 'http://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns 404 in the standard format for unknown routes', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
