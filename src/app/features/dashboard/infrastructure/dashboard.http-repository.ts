import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';
import {ENV} from '@core/tokens/environment.token';
import {EnvironmentInterface} from '@core/interfaces/environment.interface';
import {Dashboard, DashboardRepository} from '../domain/dashboard.model';

@Injectable()
export class DashboardHttpRepository implements DashboardRepository {
  private http = inject(HttpClient);
  private env = inject<EnvironmentInterface>(ENV);

  load(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.env.server_url}/me/dashboard`);
  }
}
