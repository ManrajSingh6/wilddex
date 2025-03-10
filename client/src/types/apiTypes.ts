export interface ApiResponse<T> {
  readonly code: number;
  readonly data: T;
  readonly message: string;
}
