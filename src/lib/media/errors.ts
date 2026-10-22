export type MediaErrorCode =
  | "config"
  | "auth"
  | "validation"
  | "provider"
  | "timeout"
  | "rate";

export class MediaError extends Error {
  readonly code: MediaErrorCode;
  readonly status: number;
  readonly correlationId: string;

  constructor(code: MediaErrorCode, message: string, status: number, correlationId: string) {
    super(message);
    this.name = "MediaError";
    this.code = code;
    this.status = status;
    this.correlationId = correlationId;
  }
}

export function mediaCorrelationId() {
  return `media_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
