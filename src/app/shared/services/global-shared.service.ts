import { Inject, Injectable, InjectionToken } from '@angular/core';

import { BaseStoreService } from './base-store.service';
import { GlobalStoreService, GlobalStoreConfig } from "@core/services/global-store/global-store.service";
import { provideGlobalStore } from "@core/services/global-store/global-store.providers";
import { GlobalStoreState } from "@core/services/global-store/interfaces/global-store.interface";

const GLOBAL_SHARED_INITIAL_STATE: GlobalStoreState = {
  dataArray: [],
  dataObject: null,
  dataString: '',
  dataNumber: undefined
};

const GLOBAL_SHARED_CONFIG: GlobalStoreConfig = {
  storageKey: 'APP_GLOBAL_STORE',
  maxStorageSize: 2 * 1024 * 1024,
  enableLogging: true,
  sensitiveFields: [],
};

export const GLOBAL_SHARED_STORE = new InjectionToken<GlobalStoreService<GlobalStoreState>>('GLOBAL_SHARED_STORE');
export const GLOBAL_SHARED_STORE_PROVIDERS = provideGlobalStore(
  GLOBAL_SHARED_STORE,
  GLOBAL_SHARED_INITIAL_STATE,
  GLOBAL_SHARED_CONFIG
);

@Injectable({ providedIn: 'root' })
export class GlobalSharedService extends BaseStoreService<GlobalStoreState> {
  constructor(@Inject(GLOBAL_SHARED_STORE) store: GlobalStoreService<GlobalStoreState>) {
    super(store);
  }

  setDataString<T extends string>(name: any, value: T): void {
    this.setValue(name, value);
  }

  getDataString(name: any): string | null {
    return this.getValue(name) as string | null;
  }

  setDataNumber<T extends number>(name: any, value: T): void {
    this.setValue(name, value);
  }

  getDataNumber(name: any): number | null {
    return this.getValue(name) as number | null;
  }

  setDataArray<T extends Array<any>>(name: any, value: T): void {
    this.setValue(name, value);
  }

  getDataArray<T>(name: any): T {
    return this.getValue(name) as T;
  }

  setDataObject<T extends object>(name: any, value: T): void {
    this.setValue(name, value);
  }

  getDataObject<T extends object>(name: any): T {
    return this.getValue(name) as T;
  }

  clear() {
    this.clearAll();
  }
}
