import {createActionGroup, createFeature, createReducer, emptyProps, on, props} from '@ngrx/store';
import {User} from '../../domain/user.entity';

export const authActions = createActionGroup({
  source: 'Auth',
  events: {
    'Login': props<{email: string; password: string}>(),
    'Register': props<{name: string; email: string; password: string}>(),
    'Auth Success': props<{user: User; isNew: boolean}>(),
    'Auth Failure': props<{error: string}>(),
    'Logout': emptyProps(),
    'Logout Done': emptyProps(),
    'User Updated': props<{user: User}>(),
  },
});

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {user: null, loading: false, error: null};

export const authFeature = createFeature({
  name: 'auth',
  reducer: createReducer(
    initialState,
    on(authActions.login, authActions.register, state => ({...state, loading: true, error: null})),
    on(authActions.authSuccess, (state, {user}) => ({user, loading: false, error: null})),
    on(authActions.authFailure, (state, {error}) => ({...state, loading: false, error})),
    on(authActions.logoutDone, () => initialState),
    on(authActions.userUpdated, (state, {user}) => ({...state, user})),
  ),
});
