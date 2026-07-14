import {GlobalStoreService} from "@core/services/global-store/global-store.service";


export class BaseStoreService<T extends object> {
  protected store: GlobalStoreService<T>;

  constructor(store: GlobalStoreService<T>) {
    this.store = store;
  }

  getValue<K extends keyof T>(key: K): T[K] {
    return this.store.getValue(key);
  }

  setValue<K extends keyof T>(key: K, value: T[K]): void {
    this.store.set(key, value);
  }

  reset(state: T): void {
    this.store.reset(state);
  }

  getState(): T {
    return this.store.getState();
  }

  clearAll(): void {
    this.store.clearAll();
  }

  getStorageInfo() {
    return this.store.getStorageInfo();
  }
}
