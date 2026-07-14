import { InjectionToken, Provider } from '@angular/core';
import { GlobalStoreConfig, GlobalStoreService } from '@core/services/global-store/global-store.service';

export function provideGlobalStore<T extends object>(
  token: InjectionToken<GlobalStoreService<T>>,
  initialState: T,
  config: GlobalStoreConfig
): Provider[] {
  return [
    {
      provide: token,
      useFactory: () => new GlobalStoreService<T>(initialState, config),
    },
  ];
}
