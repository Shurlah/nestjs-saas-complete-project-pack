import { HealthController } from './health.controller';

describe('HealthController', () => {
  const controller = new HealthController();

  it('reports a healthy process', () => {
    const result = controller.getHealth();

    expect(result.message).toBe('Service is healthy');
    expect(result.data.status).toBe('ok');
    expect(new Date(result.data.timestamp).toISOString()).toBe(
      result.data.timestamp,
    );
  });
});
