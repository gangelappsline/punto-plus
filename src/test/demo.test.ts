import { beforeEach, describe, expect, it } from 'vitest';
import { readDB, redeemDemo, updateDB } from '../services/demo';
import { api } from '../services/api';
import { businessSchema } from '../lib/types';
beforeEach(() => localStorage.clear());
describe('Persistencia y reglas del modo demo', () => {
  it('inicia con tres tarjetas, 15 sellos y una recompensa', () => {
    const cards = readDB().cards.filter((c) => c.joined);
    expect(cards).toHaveLength(3);
    expect(cards.reduce((n, c) => n + c.stamps, 0)).toBe(15);
    expect(cards.filter((c) => c.stamps >= c.goal)).toHaveLength(1);
  });
  it('canjea exactamente una vez y registra el movimiento', () => {
    redeemDemo('matcha');
    expect(readDB().cards.find((c) => c.id === 'matcha')?.stamps).toBe(0);
    expect(readDB().activity[0].type).toBe('reward');
    expect(() => redeemDemo('matcha')).toThrow('Todavía necesitas');
    expect(readDB().activity.filter((a) => a.type === 'reward')).toHaveLength(1);
  });
  it('rechaza canjes de tarjetas incompletas sin mutar datos', () => {
    const before = readDB();
    expect(() => redeemDemo('cafe')).toThrow();
    expect(readDB()).toEqual(before);
  });
  it('genera un token de venta de un solo uso y confirma la compra del cliente', async () => {
    const saleToken = await api.newSaleToken();
    expect(saleToken.token).toMatch(/^[A-Z0-9]{8}$/);
    expect(Date.parse(saleToken.expiresAt)).toBeGreaterThan(Date.now());
    expect(readDB().saleToken?.token).toBe(saleToken.token);

    await api.confirmSaleToken(saleToken.token.toLowerCase());
    expect(readDB().saleToken).toBeNull();
    expect(readDB().cards.find((card) => card.id === 'cafe')?.stamps).toBe(7);
    expect(readDB().activity[0].title).toContain('Compra verificada');
    await expect(api.confirmSaleToken(saleToken.token)).rejects.toThrow('ya fue utilizado');
  });
  it('rechaza tokens de venta vencidos sin registrar la compra', async () => {
    const saleToken = await api.newSaleToken();
    updateDB((db) => {
      db.saleToken!.expiresAt = new Date(Date.now() - 1000).toISOString();
    });

    await expect(api.confirmSaleToken(saleToken.token)).rejects.toThrow('venció');
    expect(readDB().saleToken).toBeNull();
    expect(readDB().cards.find((card) => card.id === 'cafe')?.stamps).toBe(6);
  });
  it('se recupera de almacenamiento inválido', () => {
    localStorage.setItem('punto-plus-demo-v1', '{bad');
    expect(readDB().cards).toHaveLength(4);
    localStorage.setItem('punto-plus-demo-v1', JSON.stringify({ cards: null }));
    expect(readDB().cards).toHaveLength(4);
  });
  it('valida las metas de la tarjeta y preserva el logo', async () => {
    expect(businessSchema.safeParse({ ...readDB().business, goal: 0 }).success).toBe(false);
    expect(businessSchema.safeParse({ ...readDB().business, goal: 13 }).success).toBe(false);
    await api.saveBusiness({
      ...readDB().business,
      name: 'Mi cafetería',
      goal: 10,
      logo: 'data:image/png;base64,test',
    });
    expect(readDB().cards[0]).toMatchObject({
      name: 'Mi cafetería',
      goal: 10,
      logo: 'data:image/png;base64,test',
    });
  });
  it('guarda el perfil completo del negocio desde el asistente de alta', async () => {
    await api.saveBusiness({
      ...readDB().business,
      name: 'Café Test',
      categories: ['Cafetería', 'Desayuno'],
      menuItems: [{ id: 'm1', name: 'Café americano', price: '45' }],
      primaryColor: '#2399A0',
      secondaryColor: '#F5BE8B',
      onboarded: true,
    });
    const business = readDB().business;
    expect(business.onboarded).toBe(true);
    expect(business.categories).toEqual(['Cafetería', 'Desayuno']);
    expect(business.menuItems[0]).toMatchObject({ name: 'Café americano', price: '45' });
    expect(business.primaryColor).toBe('#2399A0');
  });
  it('persiste los tres tipos de promoción con sus condiciones', async () => {
    const base = {
      title: 'Promoción',
      description: 'Condiciones de la promoción de prueba.',
      expires: '2026-12-31',
      image: '/images/coffee.webp',
    };
    await api.addPromotion({ ...base, type: 'simple', purchasesRequired: 5, freeProduct: 'Café' });
    await api.addPromotion({
      ...base,
      type: 'steps',
      tiers: [{ points: 10, benefit: 'Postre gratis' }],
    });
    await api.addPromotion({
      ...base,
      type: 'direct',
      appliesAlways: false,
      weekdays: [2, 4],
      startTime: '09:00',
      endTime: '12:00',
    });
    const [direct, steps, simple] = readDB().promotions;
    expect(simple).toMatchObject({ type: 'simple', purchasesRequired: 5, freeProduct: 'Café' });
    expect(steps.tiers).toEqual([{ points: 10, benefit: 'Postre gratis' }]);
    expect(direct).toMatchObject({
      type: 'direct',
      appliesAlways: false,
      weekdays: [2, 4],
      startTime: '09:00',
      endTime: '12:00',
    });
  });
  it('no persiste cambios si falla una transacción', () => {
    expect(() =>
      updateDB((db) => {
        db.cards[0].stamps = 0;
        throw new Error('Abort');
      }),
    ).toThrow();
    expect(readDB().cards[0].stamps).toBe(6);
  });
});
