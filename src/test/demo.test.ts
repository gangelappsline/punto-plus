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
  it('guarda favoritos entre lecturas', async () => {
    await api.toggleFavorite('p1');
    expect(await api.favorites()).toContain('p1');
    await api.toggleFavorite('p1');
    expect(await api.favorites()).not.toContain('p1');
  });
  it('agrega una tarjeta sin duplicar la afiliación', async () => {
    await api.join('flor');
    await api.join('flor');
    expect(readDB().cards.filter((c) => c.joined)).toHaveLength(4);
    expect(readDB().activity.filter((a) => a.business === 'Casa Botánica')).toHaveLength(1);
  });
  it('valida el QR y el máximo de sellos antes de registrar una compra', async () => {
    await expect(api.stamp('invalido')).rejects.toThrow('QR no válido');
    await api.stamp('punto-plus:demo:sofia');
    expect(readDB().cards.find((c) => c.id === 'cafe')?.stamps).toBe(7);
    await api.stamp('punto-plus:demo:sofia');
    await expect(api.stamp('punto-plus:demo:sofia')).rejects.toThrow('tarjeta está completa');
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
