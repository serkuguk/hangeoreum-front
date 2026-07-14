import {InjectionToken} from "@angular/core";
import {EnvironmentInterface} from "@core/interfaces/environment.interface";

export const ENV = new InjectionToken<EnvironmentInterface>('environment');
