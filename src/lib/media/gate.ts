import { MediaError } from "@/lib/media/errors";

export type MediaSession = {
  id?: string;
  role?: string;
} | null;

/** Server-side gate for product media mutations. UI hiding is not sufficient. */
export function assertMediaAdmin(session: MediaSession, correlationId: string) {
  if (!session) {
    throw new MediaError("auth", "Sign in to continue.", 401, correlationId);
  }
  if (session.role !== "admin") {
    throw new MediaError("auth", "Studio access is required.", 403, correlationId);
  }
}
