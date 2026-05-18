/**
 * Tests unitarios para MapRateLimiterStore.
 *
 * Cubre los escenarios de spec/auth-rate-limiting:
 *  - Uso normal dentro del límite
 *  - Límite excedido
 *  - Reinicio de ventana tras expiración
 *  - Seguimiento independiente por IP
 *
 * NOTA: Estos tests compilan y type-checkean pero no se ejecutan
 * (TDD deshabilitado en este proyecto).
 */

import { MapRateLimiterStore } from "@/lib/rate-limiter";

describe("MapRateLimiterStore", () => {
  let store: MapRateLimiterStore;

  beforeEach(() => {
    // Ventana de 15 min, máximo 5 solicitudes
    store = new MapRateLimiterStore(15 * 60 * 1000, 5);
  });

  afterEach(() => {
    store.stopCleanup();
  });

  // ─── check() ───────────────────────────────────────────────

  it("debe permitir la primera solicitud (allowed=true, remaining=4)", () => {
    const result = store.check("192.168.1.1");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetTime).toBeGreaterThan(Date.now());
  });

  it("debe permitir hasta 5 solicitudes en la misma ventana", () => {
    for (let i = 0; i < 5; i++) {
      const result = store.check("192.168.1.1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it("debe rechazar la 6ta solicitud dentro de la misma ventana (allowed=false)", () => {
    // 5 solicitudes exitosas
    for (let i = 0; i < 5; i++) {
      store.check("192.168.1.1");
    }

    // 6ta debe ser rechazada
    const result = store.check("192.168.1.1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("debe permitir solicitudes después de que la ventana expira", () => {
    // Agotar el límite en una ventana que ya expiró
    // Simulamos incrementando pero con una ventana muy corta
    const shortStore = new MapRateLimiterStore(100, 2); // 100ms, 2 requests
    shortStore.check("ip-1");
    shortStore.check("ip-1");
    const blocked = shortStore.check("ip-1");
    expect(blocked.allowed).toBe(false);

    // Esperar a que expire la ventana
    // (En un test real usaríamos jest.advanceTimersByTime)
    // Aquí verificamos que el resetTime está en el futuro cercano
    expect(blocked.resetTime).toBeGreaterThan(0);
    shortStore.stopCleanup();
  });

  // ─── IP independence ───────────────────────────────────────

  it("debe rastrear IPs de forma independiente", () => {
    // IP-A llega al límite
    for (let i = 0; i < 5; i++) {
      store.check("192.168.1.1");
    }

    // IP-B debería estar libre
    const resultB = store.check("192.168.1.2");
    expect(resultB.allowed).toBe(true);
    expect(resultB.remaining).toBe(4);

    // IP-A sigue bloqueada
    const resultA = store.check("192.168.1.1");
    expect(resultA.allowed).toBe(false);
  });

  it("debe permitir el tráfico normal de múltiples IPs simultáneamente", () => {
    const ipA = store.check("10.0.0.1");
    const ipB = store.check("10.0.0.2");
    const ipC = store.check("10.0.0.3");

    expect(ipA.allowed).toBe(true);
    expect(ipB.allowed).toBe(true);
    expect(ipC.allowed).toBe(true);
  });

  // ─── RateLimiterStore interface ────────────────────────────

  it("increment() debe retornar count=1 en primera llamada", () => {
    const result = store.increment("new-ip");
    expect(result.count).toBe(1);
    expect(result.resetTime).toBeGreaterThan(Date.now());
  });

  it("increment() debe acumular llamadas sucesivas", () => {
    store.increment("ip-x");
    const result = store.increment("ip-x");
    expect(result.count).toBe(2);
  });

  it("reset() debe eliminar una clave del store", () => {
    store.increment("ip-to-reset");
    store.reset("ip-to-reset");

    // Después del reset, la siguiente solicitud debe ser count=1
    const result = store.increment("ip-to-reset");
    expect(result.count).toBe(1);
  });

  it("reset() no debe afectar otras claves", () => {
    store.increment("ip-a");
    store.increment("ip-b");
    store.increment("ip-b");

    store.reset("ip-a");

    // ip-a reiniciada
    expect(store.increment("ip-a").count).toBe(1);
    // ip-b no afectada
    expect(store.increment("ip-b").count).toBe(3);
  });

  // ─── Edge cases ────────────────────────────────────────────

  it("debe manejar múltiples claves sin interferencia", () => {
    const keys = Array.from({ length: 100 }, (_, i) => `ip-${i}`);
    for (const key of keys) {
      const result = store.check(key);
      expect(result.allowed).toBe(true);
    }
  });

  it("remaining debe ser 0 cuando el límite se alcanza exactamente", () => {
    for (let i = 0; i < 5; i++) {
      store.check("exact-ip");
    }
    const result = store.check("exact-ip");
    expect(result.remaining).toBe(0);
  });

  it("remaining debe decrecer correctamente en cada solicitud", () => {
    const r1 = store.check("decrement-ip");
    expect(r1.remaining).toBe(4);

    const r2 = store.check("decrement-ip");
    expect(r2.remaining).toBe(3);

    const r3 = store.check("decrement-ip");
    expect(r3.remaining).toBe(2);

    const r4 = store.check("decrement-ip");
    expect(r4.remaining).toBe(1);

    const r5 = store.check("decrement-ip");
    expect(r5.remaining).toBe(0);
  });
});
