export class UnauthenticatedError extends Error {
  constructor(message = 'Not authenticated') {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}
