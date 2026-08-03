import {provideHttpClient, withInterceptors} from "@angular/common/http";
import {registerLocaleData} from "@angular/common";
import localeRu from "@angular/common/locales/ru";
import {ApplicationConfig, LOCALE_ID, provideZonelessChangeDetection} from "@angular/core";

registerLocaleData(localeRu);
import {
    provideRouter,
    withComponentInputBinding,
    withEnabledBlockingInitialNavigation
} from "@angular/router";
import {authInterceptor} from "@core/interceptors/auth.interceptor";
import {routes as appRoutes} from "./app.routes";
import {environment} from "../environments/environment";
import {AuthTokenStorageService} from "@core/services/auth-token-storage.service";
import {JwtHelperService} from '@auth0/angular-jwt';
import {AuthService} from "@core/auth/auth.service";
import {ENV} from "@core/tokens/environment.token";
import {providePrimeNG} from "primeng/config";
import {definePreset} from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import {ME_REPOSITORY} from "@features/identity/domain/repositories/me.repository";
import {MeHttpRepository} from "@features/identity/infrastructure/repositories/me.http-repository";
import {BILLING_REPOSITORY} from "@features/billing/domain/billing.model";
import {BillingHttpRepository} from "@features/billing/infrastructure/billing.http-repository";

// ---------- PrimeNG: тема Hangeoreum (오방색) поверх Aura ----------
const HangeoreumPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#eef3ff', 100: '#dbe4ff', 200: '#b8c9ff', 300: '#94adff', 400: '#6a8cff',
            500: '#3B6BFF', 600: '#2f56d9', 700: '#2544ad', 800: '#1c3382', 900: '#142457', 950: '#0c1533',
        },
        colorScheme: {
            dark: {
                surface: {
                    0: '#ffffff', 50: '#ECEAF4', 100: '#cfccdd', 200: '#b2aec5', 300: '#9A96AE',
                    400: '#6e6a84', 500: '#4a4760', 600: '#3a374d', 700: '#2A2838', 800: '#211F2E',
                    900: '#1C1B26', 950: '#13121A',
                },
            },
        },
    },
});

// ---------- Core services ----------
const CORE_PROVIDERS = [
    {provide: ENV, useValue: environment},
    {provide: LOCALE_ID, useValue: 'ru'},
    {provide: JwtHelperService, useValue: new JwtHelperService()},
    AuthTokenStorageService,
    AuthService,
    {provide: ME_REPOSITORY, useClass: MeHttpRepository},
    {provide: BILLING_REPOSITORY, useClass: BillingHttpRepository},
];

// ---------- Angular features ----------
const ANGULAR_PROVIDERS = [
    providePrimeNG({
        theme: {
            preset: HangeoreumPreset,
            options: {
                darkModeSelector: '.hg-dark',
            },
        },
    }),
    provideHttpClient(
        withInterceptors([authInterceptor]),
    ),
    provideZonelessChangeDetection()
];

// ---------- Router ----------
const ROUTER_PROVIDERS = [
    provideRouter(appRoutes,
        withComponentInputBinding(),
        withEnabledBlockingInitialNavigation(),
    ),
];

// ---------- Final Config ----------
export const appConfig: ApplicationConfig = {
    providers: [
        ...CORE_PROVIDERS,
        ...ANGULAR_PROVIDERS,
        ...ROUTER_PROVIDERS,
    ],
};
