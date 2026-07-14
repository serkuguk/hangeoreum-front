export interface User {
  uid: number;
  username: string;
  firstname: string;
  lastname: string;
  bio: string;
  access_token?: string;
  roles?: string[];
}
