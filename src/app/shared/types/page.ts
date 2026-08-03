export interface Page<T> {
  content: T[];
  totalElements: number;
  page: number;
}
