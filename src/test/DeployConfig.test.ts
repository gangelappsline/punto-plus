import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Regresiones de despliegue: una configuración equivocada deja la app en blanco
 * en producción aunque todo pase en desarrollo.
 */
const root = path.resolve(__dirname, '../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

describe('Configuración de despliegue', () => {
  it('Vercel reescribe las rutas del SPA con el catch-all, no con un lookahead', () => {
    const config = JSON.parse(read('vercel.json')) as {
      rewrites: { source: string; destination: string }[];
    };

    expect(config.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' });
    // `source` es path-to-regexp: un `(?!)` no se compila o nunca coincide, y
    // entonces /app responde 404 al recargar.
    for (const rewrite of config.rewrites) expect(rewrite.source).not.toContain('?!');
  });

  it('el index.html y el service worker nunca se cachean', () => {
    const config = JSON.parse(read('vercel.json')) as {
      headers: { source: string; headers: { key: string; value: string }[] }[];
    };
    const cacheHeader = (source: RegExp) =>
      config.headers
        .find((entry) => source.test(entry.source))
        ?.headers.find((header) => header.key === 'Cache-Control')?.value ?? '';

    expect(cacheHeader(/^\/\(index/)).toContain('no-cache');
    expect(cacheHeader(/^\/sw\.js$/)).toContain('no-cache');
    expect(cacheHeader(/^\/assets\//)).toContain('immutable');
  });

  it('Netlify y Apache también resuelven las rutas con index.html', () => {
    expect(read('public/_redirects').trim()).toBe('/* /index.html 200');

    const htaccess = path.join(root, 'public/.htaccess');
    expect(existsSync(htaccess)).toBe(true);
    const rules = readFileSync(htaccess, 'utf8');
    expect(rules).toContain('RewriteRule . /index.html [L]');
    expect(rules).toContain('REQUEST_FILENAME');
  });

  it('el index.html trae un respaldo visible si el bundle no arranca', () => {
    const html = read('index.html');
    expect(html).toContain('id="boot-fallback"');
    expect(html).toContain('vite:preloadError');
    expect(html).toContain('<noscript>');
    // El respaldo se retira al montar: main.tsx marca el arranque.
    expect(read('src/main.tsx')).toContain("dataset.appBooted = 'true'");
  });

  it('el service worker limpia las precargas de versiones anteriores', () => {
    expect(read('vite.config.ts')).toContain('cleanupOutdatedCaches: true');
  });
});
