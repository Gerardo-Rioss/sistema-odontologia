/**
 * Interfaz genérica para un store de rate limiting.
 * Permite intercambiar implementaciones (Map, Redis, etc.)
 * sin modificar la lógica de negocio.
 */
export interface RateLimiterStore {
  /**
   * Incrementa el contador para una clave y retorna
   * el conteo actual junto al timestamp de reinicio de la ventana.
   */
  increment(key: string): { count: number; resetTime: number };

  /**
   * Reinicia el contador para una clave.
   */
  reset(key: string): void;
}

/**
 * Resultado de la verificación de rate limit.
 */
export interface RateLimitResult {
  /** Si la solicitud está permitida */
  allowed: boolean;
  /** Intentos restantes en la ventana actual */
  remaining: number;
  /** Timestamp Unix (ms) en que se reinicia la ventana */
  resetTime: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Implementación en memoria del store de rate limiting usando Map.
 *
 * Ventana deslizante: 15 minutos (900,000 ms).
 * Límite: 5 solicitudes por ventana por IP.
 * Cleanup automático cada 60 segundos para evitar fugas de memoria.
 */
export class MapRateLimiterStore implements RateLimiterStore {
  private store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * @param windowMs Duración de la ventana en milisegundos (default: 15 min)
   * @param maxRequests Máximo de solicitudes por ventana (default: 5)
   */
  constructor(windowMs = 15 * 60 * 1000, maxRequests = 5) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.startCleanup();
  }

  /**
   * Verifica si una clave (IP) puede hacer una solicitud.
   *
   * @param key Identificador único (generalmente la IP del cliente)
   * @returns Resultado con allowed, remaining y resetTime
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key);

    // Sin entradas previas o ventana expirada: primera solicitud de la ventana
    if (!entry || now > entry.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + this.windowMs });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs,
      };
    }

    // Dentro de la misma ventana: incrementar
    entry.count += 1;

    const allowed = entry.count <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - entry.count);

    return { allowed, remaining, resetTime: entry.resetTime };
  }

  // ─── RateLimiterStore implementation ──────────────────────

  increment(key: string): { count: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + this.windowMs });
      return { count: 1, resetTime: now + this.windowMs };
    }

    entry.count += 1;
    return { count: entry.count, resetTime: entry.resetTime };
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  // ─── Cleanup ─────────────────────────────────────────────

  /**
   * Elimina entradas expiradas del store cada 60 segundos
   * para evitar crecimiento indefinido de memoria.
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetTime) {
          this.store.delete(key);
        }
      }
    }, 60_000);
  }

  /**
   * Detiene el intervalo de limpieza. Útil en tests.
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

/** Instancia singleton del rate limiter (5 req / 15 min window). */
export const rateLimiter = new MapRateLimiterStore();
