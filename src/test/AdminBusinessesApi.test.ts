import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';

vi.stubEnv('VITE_DATA_MODE', 'api');
vi.resetModules();

const { http } = await import('../services/http');
const { api } = await import('../services/api');
const apiMock = new AxiosMockAdapter(http);

afterAll(() => vi.unstubAllEnvs());
beforeEach(() => apiMock.reset());

describe('Administración de negocios', () => {
  it('consulta /api/admin/business y normaliza negocios y métricas', async () => {
    apiMock.onGet('/api/admin/business').reply(200, {
      data: {
        businesses: [
          {
            id: 8,
            business_name: 'Café del Centro',
            email: 'hola@cafe.mx',
            status: 'active',
            membership: { is_active: true, expires_at: '2026-11-20' },
            customer_count: 42,
            current_month_revenue: 8200,
          },
        ],
        stats: {
          current_month_customers: 42,
          previous_month_customers: 38,
          current_month_revenue: 8200,
          previous_month_revenue: 7600,
          expiring_memberships_count: 3,
        },
      },
    });

    const report = await api.adminBusinesses();

    expect(apiMock.history.get[0].url).toBe('/api/admin/business');
    expect(report.businesses[0]).toMatchObject({
      id: '8',
      name: 'Café del Centro',
      status: 'active',
      membershipActive: true,
      membershipExpiresAt: '2026-11-20',
      customerCount: 42,
      currentMonthRevenue: 8200,
    });
    expect(report.statistics).toEqual({
      currentMonthCustomers: 42,
      previousMonthCustomers: 38,
      currentMonthRevenue: 8200,
      previousMonthRevenue: 7600,
      expiringMemberships: 3,
    });
  });

  it('crea, actualiza y elimina negocios usando la ruta REST de administración', async () => {
    apiMock.onPost('/api/admin/business').reply(201, { id: 12 });
    apiMock.onPut('/api/admin/business/12').reply(200, { id: 12 });
    apiMock.onDelete('/api/admin/business/12').reply(204);
    const input = {
      name: 'La Casa del Té',
      email: 'hola@casadelte.mx',
      phone: '55 1234 5678',
      status: 'onboarding' as const,
      membershipExpiresAt: '2026-12-01',
    };

    await api.createAdminBusiness(input);
    await api.updateAdminBusiness('12', input);
    await api.deleteAdminBusiness('12');

    expect(apiMock.history.post[0].url).toBe('/api/admin/business');
    expect(JSON.parse(apiMock.history.post[0].data as string)).toEqual({
      name: input.name,
      email: input.email,
      phone: input.phone,
      status: input.status,
      membership_expires_at: input.membershipExpiresAt,
    });
    expect(apiMock.history.put[0].url).toBe('/api/admin/business/12');
    expect(JSON.parse(apiMock.history.put[0].data as string)).toEqual({
      name: input.name,
      email: input.email,
      phone: input.phone,
      status: input.status,
      membership_expires_at: input.membershipExpiresAt,
    });
    expect(apiMock.history.delete[0].url).toBe('/api/admin/business/12');
  });

  it('rechaza estados fuera del conjunto permitido', async () => {
    await expect(
      api.createAdminBusiness({ name: 'Prueba', status: 'paused' } as never),
    ).rejects.toThrow();
    expect(apiMock.history.post).toHaveLength(0);
  });
});
