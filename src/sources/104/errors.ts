export type SourceErrorCode =
  | "SOURCE_RATE_LIMITED"
  | "SOURCE_FORBIDDEN"
  | "SOURCE_UNAVAILABLE"
  | "SOURCE_TIMEOUT"
  | "SOURCE_CHALLENGE"
  | "SOURCE_NON_JSON"
  | "SOURCE_SCHEMA_CHANGED"
  | "INVALID_FILTER"
  | "INVALID_JOB_REF";

export class SourceError extends Error {
  constructor(
    public readonly code: SourceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "SourceError";
  }
}
