import {inject, Injectable} from '@angular/core'
import {JwtHelperService} from "@auth0/angular-jwt";
import {Router} from "@angular/router";

@Injectable()
export class AuthTokenStorageService {

  private jwtHelper: JwtHelperService = inject(JwtHelperService);
  private router: Router = inject(Router);

  public setToken(token: string | null): void {
    if (typeof token === "string")
      localStorage.setItem('access_token', token);
  }

  public refreshToken(token: string | null): void {
    if (typeof token === "string")
      localStorage.setItem('refresh_token', token);
  }

  public getToken(token: string): string | null {
    return localStorage.getItem(token);
  }

  public isAuthenticate(): boolean {
    const token: string | null = localStorage.getItem('access_token');
    return token ? !this.jwtHelper.isTokenExpired(token) : false;
  }

  public decodeToken(): any | null {
    const token: string | null = localStorage.getItem('access_token');
    return  token ? this.jwtHelper.decodeToken(token) : null;
  }

  public logOut(): void {
    localStorage.clear();
  }
}
