import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable, map, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {ENV} from '@core/tokens/environment.token';
import {EnvironmentInterface} from '@core/interfaces/environment.interface';
import {BillingRepository, Plan, Subscription} from '../domain/billing.model';

@Injectable()
export class BillingHttpRepository implements BillingRepository {
  private http = inject(HttpClient);
  private base = `${inject<EnvironmentInterface>(ENV).server_url}/billing`;

  plans(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.base}/plans`);
  }

  subscription(): Observable<Subscription | null> {
    // бэк отвечает 204 No Content, если подписки нет
    return this.http.get<Subscription | null>(`${this.base}/subscription`).pipe(
      map(sub => sub ?? null),
      catchError(() => of(null)),
    );
  }

  checkout(planCode: string): Observable<{checkoutUrl: string}> {
    return this.http.post<{checkoutUrl: string}>(`${this.base}/checkout`, {planCode});
  }

  portal(): Observable<{portalUrl: string}> {
    return this.http.post<{portalUrl: string}>(`${this.base}/portal`, null);
  }
}
