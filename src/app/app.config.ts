import {HttpClient, provideHttpClient, withInterceptors} from "@angular/common/http";
import {registerLocaleData} from "@angular/common";
import localeRu from "@angular/common/locales/ru";
import {ApplicationConfig, LOCALE_ID, importProvidersFrom, provideZonelessChangeDetection} from "@angular/core";

registerLocaleData(localeRu);
import {
    provideRouter,
    withComponentInputBinding,
    withEnabledBlockingInitialNavigation
} from "@angular/router";
import {authInterceptor} from "@core/interceptors/auth.interceptor";
import {routes as appRoutes} from "./app.routes";
import {provideEffects} from "@ngrx/effects";
import {provideStore} from '@ngrx/store';
import {provideRouterStore, routerReducer} from "@ngrx/router-store";
import {provideStoreDevtools} from "@ngrx/store-devtools";
import {environment} from "../environments/environment";
import {TranslateLoader, TranslateModule, TranslateService} from "@ngx-translate/core";
import {TranslateHttpLoader} from "@ngx-translate/http-loader";
import {AuthTokenStorageService} from "@core/services/auth-token-storage.service";
import {JwtHelperService} from '@auth0/angular-jwt';
import {AuthService} from "@core/auth/auth.service";
import {ENV} from "@core/tokens/environment.token";
import {providePrimeNG} from "primeng/config";
import {definePreset} from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import {GLOBAL_SHARED_STORE_PROVIDERS} from "@shared/services/global-shared.service";
import {authFeature} from "@features/identity/application/store/auth.store";
import * as authEffects from "@features/identity/application/store/auth.effects";
import {ME_REPOSITORY} from "@features/identity/domain/repositories/me.repository";
import {MeHttpRepository} from "@features/identity/infrastructure/repositories/me.http-repository";
import {BILLING_REPOSITORY} from "@features/billing/domain/billing.model";
import {BillingHttpRepository} from "@features/billing/infrastructure/billing.http-repository";

// ---------- Factories ----------

export function HttpLoaderFactory(http: HttpClient) {
    return new TranslateHttpLoader(http);
}

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
    TranslateService,
    {provide: ME_REPOSITORY, useClass: MeHttpRepository},
    {provide: BILLING_REPOSITORY, useClass: BillingHttpRepository},
    ...GLOBAL_SHARED_STORE_PROVIDERS,
];

// ---------- Third-party modules ----------
const MODULE_PROVIDERS = [
    importProvidersFrom(
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient],
            },
            defaultLanguage: 'ru',
        }),
    ),
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

// ---------- NgRx (только auth-сессия, остальной стейт — signals в фасадах) ----------
const NGRX_PROVIDERS = [
    provideStore({
        router: routerReducer,
        [authFeature.name]: authFeature.reducer
    }),
    provideEffects(authEffects),
    provideRouterStore(),
    provideStoreDevtools({
        maxAge: 25,
        logOnly: environment.production,
        autoPause: true,
        trace: false,
        traceLimit: 75,
    }),
];

// ---------- Final Config ----------
export const appConfig: ApplicationConfig = {
    providers: [
        ...CORE_PROVIDERS,
        ...MODULE_PROVIDERS,
        ...ANGULAR_PROVIDERS,
        ...ROUTER_PROVIDERS,
        ...NGRX_PROVIDERS,
    ],
};
