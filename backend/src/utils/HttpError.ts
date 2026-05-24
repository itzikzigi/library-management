/**
 * Typed error class. Controllers throw these; the errorHandler middleware
 * converts them into the canonical { error: { code, message } } JSON shape.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}
