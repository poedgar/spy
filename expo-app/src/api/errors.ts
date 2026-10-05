export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string[]>,
  ) {
    super(422, message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor() {
    super("Can't reach SpyNet. Check your connection.");
    this.name = 'NetworkError';
  }
}
