export interface ApiSuccess<T> {
  data: T;
}

export interface ApiListMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface ApiListSuccess<T> {
  data: T[];
  meta: ApiListMeta;
}

export interface ApiError {
  error: {
    message: string;
    status: number;
    details?: unknown[];
  };
}
