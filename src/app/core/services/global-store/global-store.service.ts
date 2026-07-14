import { computed, Inject, Injectable, InjectionToken, Optional, signal, Signal, WritableSignal } from '@angular/core';
import { APP_STATE } from '@shared/tokens/store-token.constant';


/**
 * Interfaz para la configuración de GlobalStore
 */
export interface GlobalStoreConfig {
  /** Clave para almacenar en localStorage */
  storageKey?: string;
  /** Tamaño máximo de datos para localStorage (en bytes) */
  maxStorageSize?: number;
  /** Habilitar registro de errores */
  enableLogging?: boolean;
  /** Campos que no deben guardarse en localStorage (por seguridad) */
  sensitiveFields?: string[];
}

/**
 * Token para la configuración de GlobalStore
 */
export const GLOBAL_STORE_CONFIG = new InjectionToken<GlobalStoreConfig>('GLOBAL_STORE_CONFIG');

@Injectable({ providedIn: 'root' })
export class GlobalStoreService<T extends object> {
  // Configuración predeterminada
  private readonly DEFAULT_STORAGE_KEY = 'GLOBAL_STORE_STATE';
  private readonly DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly DEFAULT_ENABLE_LOGGING = true;

  // Configuración actual
  private readonly storageKey: string;
  private readonly maxStorageSize: number;
  private readonly enableLogging: boolean;
  private readonly sensitiveFields: Set<string>;

  private readonly stateSig!: WritableSignal<T>;

  constructor(@Inject(APP_STATE) initialState: T, @Optional() @Inject(GLOBAL_STORE_CONFIG) config?: GlobalStoreConfig) {
    // Aplicamos la configuración
    this.storageKey = config?.storageKey ?? this.DEFAULT_STORAGE_KEY;
    this.maxStorageSize = config?.maxStorageSize ?? this.DEFAULT_MAX_SIZE;
    this.enableLogging = config?.enableLogging ?? this.DEFAULT_ENABLE_LOGGING;
    this.sensitiveFields = new Set(config?.sensitiveFields ?? []);

    // Cargamos el estado guardado
    const saved = this.safeGetItem(this.storageKey);
    const state = this.safeParse(saved) ?? initialState;
    this.stateSig = signal<T>(state);

    // Guardar automáticamente al cambiar el estado
    this.persistState(state);
  }

  // ============================================================
  // TRABAJO SEGURO CON LOCALSTORAGE
  // ============================================================

  /**
   * Guardar de forma segura en localStorage con verificaciones
   */
  private safeSetItem(key: string, value: string): boolean {
    try {
      // Verificación 1: Tamaño de datos
      const sizeInBytes = new Blob([value]).size;
      if (sizeInBytes > this.maxStorageSize) {
        this.log('warn', `State size (${this.formatBytes(sizeInBytes)}) exceeds max size (${this.formatBytes(this.maxStorageSize)})`);
        return false;
      }

      // Verificación 2: Disponibilidad de localStorage
      if (!this.isLocalStorageAvailable()) {
        this.log('warn', 'localStorage is not available');
        return false;
      }

      // Verificación 3: Cuota de almacenamiento
      if (!this.hasStorageQuota(sizeInBytes)) {
        this.log('warn', 'Insufficient storage quota');
        // Intentamos liberar espacio
        this.clearOldEntries();
        // Intentamos de nuevo
        if (!this.hasStorageQuota(sizeInBytes)) {
          return false;
        }
      }

      // Guardamos
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (error instanceof DOMException) {
        // QuotaExceededError
        if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          this.log('error', 'localStorage quota exceeded', error);
          this.clearOldEntries();
        } else {
          this.log('error', 'localStorage error', error);
        }
      } else {
        this.log('error', 'Unexpected error writing to localStorage', error);
      }
      return false;
    }
  }

  /**
   * Lectura segura desde localStorage
   */
  private safeGetItem(key: string): string | null {
    try {
      if (!this.isLocalStorageAvailable()) {
        return null;
      }
      return localStorage.getItem(key);
    } catch (error) {
      this.log('error', 'Error reading from localStorage', error);
      return null;
    }
  }

  /**
   * Eliminación segura desde localStorage
   */
  private safeRemoveItem(key: string): boolean {
    try {
      if (!this.isLocalStorageAvailable()) {
        return false;
      }
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      this.log('error', 'Error removing from localStorage', error);
      return false;
    }
  }

  // ============================================================
  // VALIDACIÓN Y VERIFICACIONES
  // ============================================================

  /**
   * Verificar disponibilidad de localStorage
   */
  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verificar cuota de almacenamiento
   */
  private hasStorageQuota(requiredBytes: number): boolean {
    try {
      // Estimación aproximada del espacio utilizado
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) ?? '';
          totalSize += key.length + value.length;
        }
      }

      // Normalmente localStorage tiene un límite de 5-10MB
      const estimatedQuota = 10 * 1024 * 1024; // 10MB
      const availableSpace = estimatedQuota - totalSize;

      return availableSpace >= requiredBytes;
    } catch {
      return true; // Si no podemos verificar, asumimos que hay espacio
    }
  }

  /**
   * Limpiar entradas antiguas (excepto la clave actual)
   */
  private clearOldEntries(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key !== this.storageKey) {
          // No eliminamos claves importantes (por ejemplo, tokens de autenticación)
          if (!this.isProtectedKey(key)) {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      this.log('info', `Cleared ${keysToRemove.length} old localStorage entries`);
    } catch (error) {
      this.log('error', 'Error clearing old entries', error);
    }
  }

  /**
   * Verificar si una clave está protegida (no eliminar)
   */
  private isProtectedKey(key: string): boolean {
    const protectedPrefixes = ['auth', 'token', 'user', 'session'];
    return protectedPrefixes.some(prefix => key.toLowerCase().startsWith(prefix));
  }

  // ============================================================
  // SANITIZACIÓN DE DATOS
  // ============================================================

  /**
   * Eliminar datos sensibles antes de guardar
   */
  private sanitizeForStorage(state: T): Partial<T> {
    if (this.sensitiveFields.size === 0) {
      return state;
    }

    const sanitized = { ...state };

    this.sensitiveFields.forEach(field => {
      if (field in sanitized) {
        delete (sanitized as any)[field];
        this.log('info', `Removed sensitive field "${field}" from storage`);
      }
    });

    return sanitized;
  }

  /**
   * Guardar estado actual en localStorage
   */
  private persistState(state: T): void {
    const sanitized = this.sanitizeForStorage(state);
    const json = JSON.stringify(sanitized);
    this.safeSetItem(this.storageKey, json);
  }

  /**
   * Análisis seguro de JSON
   */
  private safeParse(json: string | null): T | null {
    if (!json) return null;

    try {
      return JSON.parse(json) as T;
    } catch (error) {
      this.log('error', 'Error parsing JSON from localStorage', error);
      // Eliminamos datos dañados
      this.safeRemoveItem(this.storageKey);
      return null;
    }
  }

  // ============================================================
  // UTILIDADES
  // ============================================================

  /**
   * Registro con consideración de configuración
   */
  private log(level: 'info' | 'warn' | 'error', message: string, error?: any): void {
    if (!this.enableLogging) return;

    const prefix = `[GlobalStoreService:${this.storageKey}]`;

    switch (level) {
      case 'info':
        console.info(prefix, message);
        break;
      case 'warn':
        console.warn(prefix, message);
        break;
      case 'error':
        console.error(prefix, message, error);
        break;
    }
  }

  /**
   * Formatear tamaño en formato legible
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // ============================================================
  // API PÚBLICO
  // ============================================================

  /**
   * Obtener todo el estado (sincrónico)
   */
  getState(): T {
    return this.stateSig();
  }

  /**
   * Obtener valor por clave (sincrónico)
   */
  getValue<K extends keyof T>(key: K): T[K] {
    return this.stateSig()[key];
  }

  /**
   * Signal de todo el estado
   */
  state(): Signal<T> {
    return this.stateSig.asReadonly();
  }

  /**
   * Signal de valor por clave
   */
  select<K extends keyof T>(key: K): Signal<T[K] | undefined> {
    return computed(() => {
      const s = this.stateSig();
      return s ? s[key] : undefined;
    });
  }

  /**
   * Establecer valor por clave
   */
  set<K extends keyof T>(key: K, data: T[K]): void {
    const curr = this.stateSig();
    const next = { ...curr, [key]: data };
    this.stateSig.set(next);
    this.persistState(next);
  }

  /**
   * Actualizar valor por clave mediante una función
   */
  updateStore<K extends keyof T>(key: K, fn: (prev: T[K]) => T[K]): void {
    const curr = this.stateSig();
    const next = { ...curr, [key]: fn(curr[key]) };
    this.stateSig.set(next);
    this.persistState(next);
  }

  /**
   * Limpiar valor por clave
   */
  clear<K extends keyof T>(key: K): void {
    const curr = this.stateSig();
    const { [key]: _removed, ...rest } = curr as Record<string, unknown>;
    const next = rest as T;
    this.stateSig.set(next);
    this.persistState(next);
  }

  /**
   * Restablecer estado al inicial
   */
  reset(newInitial: T): void {
    this.stateSig.set(newInitial);
    this.persistState(newInitial);
  }

  /**
   * Actualización parcial del estado
   */
  patchState(partial: Partial<T>): void {
    const curr = this.stateSig();
    const next = { ...curr, ...partial };
    this.stateSig.set(next);
    this.persistState(next);
  }

  /**
   * Limpieza completa (incluida localStorage)
   */
  clearAll(): void {
    this.safeRemoveItem(this.storageKey);
    this.log('info', 'Cleared all state from localStorage');
  }

  /**
   * Obtener información del almacenamiento
   */
  getStorageInfo(): {
    key: string;
    currentSize: number;
    maxSize: number;
    utilization: number;
    isAvailable: boolean;
  } {
    const json = this.safeGetItem(this.storageKey) ?? '';
    const currentSize = new Blob([json]).size;

    return {
      key: this.storageKey,
      currentSize,
      maxSize: this.maxStorageSize,
      utilization: (currentSize / this.maxStorageSize) * 100,
      isAvailable: this.isLocalStorageAvailable(),
    };
  }
}
