export interface GlobalStoreState<T = any> {
  dataArray: T;
  dataObject: T | null;
  dataString: string;
  dataNumber: undefined;
}

export const STORE_CONFIG: GlobalStoreState = {
  dataArray: [],
  dataObject: null,
  dataString: '',
  dataNumber: undefined
};
