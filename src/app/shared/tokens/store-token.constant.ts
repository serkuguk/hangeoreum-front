import {InjectionToken} from "@angular/core";

export const APP_STATE = new InjectionToken<any>('APP_STATE', {
  providedIn: 'root',
  factory: () => ({})
});
