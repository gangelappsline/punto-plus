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
    expect(report.statistics).toMatchObject({
      currentMonthCustomers: 42,
      previousMonthCustomers: 38,
      currentMonthRevenue: 8200,
      previousMonthRevenue: 7600,
      expiringMemberships: 3,
    });
  });

  it('lee la respuesta paginada con stats anidadas de la API de plataforma', async () => {
    apiMock.onGet('/api/admin/business').reply(200, {
      stats: {
        businesses: {
          total: 2,
          active: 2,
          inactive: 0,
          without_loyalty_cards: 1,
          new_last_30_days: 2,
          new_this_month: 0,
          trashed: 0,
        },
        customers: { total: 3, active: 2, completed: 1, new_last_30_days: 3 },
        loyalty_cards: { total: 1, active: 1, public: 1 },
        stamps: { total: 12, today: 0, last_30_days: 0 },
        promotions: { total: 1, active: 0 },
        owners: { total: 2, active: 2 },
        redemptions: { total: 4, today: 1, last_30_days: 4 },
        rewards: { total: 2, active: 1 },
        products: { total: 5, active: 4 },
        averages: { customers_per_business: 1.5 },
        growth: [
          { month: '2026-10', businesses: 2, customers: 3 },
          { month: '2026-11', businesses: 0, customers: 0 },
        ],
      },
      businesses: {
        data: [
          {
            id: 'uuid-taqueria',
            name: 'Taquería Chayito',
            slug: 'taqueria-chayito',
            description: 'Tacos y antojitos',
            email: null,
            phone: null,
            logo_url: '[logo](http://127.0.0.1:8000/storage/taqueria.webp)',
            is_active: true,
            is_deleted: false,
            owner: { name: 'Ángel Rodríguez', email: 'angel@example.com', phone: '+525500000000' },
            categories: [{ id: 1, name: 'Tacos', sort_order: 0 }],
            loyalty_cards_count: 0,
            customers_count: 0,
            stamps_count: 0,
            promotions_count: 0,
            created_at: '2026-10-30T17:49:34-06:00',
          },
        ],
        meta: { current_page: 1, last_page: 4, per_page: 15, total: 52 },
      },
    });

    const report = await api.adminBusinesses();

    expect(report.businesses).toHaveLength(1);
    expect(report.businesses[0]).toMatchObject({
      id: 'uuid-taqueria',
      name: 'Taquería Chayito',
      status: 'active',
      isActive: true,
      category: 'Tacos',
      ownerName: 'Ángel Rodríguez',
      email: 'angel@example.com',
      phone: '+525500000000',
      loyaltyCardCount: 0,
      customerCount: 0,
      stampsCount: 0,
      promotionsCount: 0,
      logo: 'https://api.punto-plus.com.mx/storage/taqueria.webp',
    });
    expect(report.statistics).toMatchObject({
      currentMonthCustomers: 0,
      previousMonthCustomers: 3,
      businesses: { total: 2, active: 2, withoutLoyaltyCards: 1, newLast30Days: 2 },
      customers: { total: 3, active: 2, completed: 1 },
      loyaltyCards: { total: 1, active: 1, public: 1 },
      stamps: { total: 12, today: 0, last30Days: 0 },
      promotions: { total: 1, active: 0 },
      owners: { total: 2, active: 2 },
      redemptions: { total: 4, today: 1, last30Days: 4 },
      rewards: { total: 2, active: 1 },
      products: { total: 5, active: 4 },
      averages: { customersPerBusiness: 1.5 },
    });
    expect(report.pagination).toEqual({ currentPage: 1, lastPage: 4, perPage: 15, total: 52 });
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
