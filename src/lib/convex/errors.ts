/**
 * Turn a thrown Convex error into a sentence worth showing a person.
 *
 * Mirrors lib/sendErrors.ts on the website: the send path throws ConvexError
 * so its refusal reason survives to the client in `data`. Plain Errors from
 * other functions arrive wrapped in Convex's transport framing
 * ("[CONVEX A(ses:sendEmail)] [Request ID: ...] Server Error Uncaught Error: ...");
 * the sentence the function wrote is the part after "Uncaught Error:".
 */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const { data } = err as { data: unknown };
    if (typeof data === 'string' && data.length > 0) return data;
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      return data.message;
    }
  }
  if (err instanceof Error && err.message) {
    const uncaught = err.message.split('Uncaught Error:').pop()?.trim();
    const cleaned = (uncaught ?? err.message)
      .replace(/^\[CONVEX [^\]]*\]\s*/, '')
      .replace(/^\[Request ID: [^\]]*\]\s*/, '')
      .split('\n')[0]
      .replace(/\s+at .*$/, '')
      .trim();
    if (!cleaned || cleaned === 'Server Error') return fallback;
    return cleaned;
  }
  return fallback;
}

/** True when the backend has no such public function (e.g. the optional mobile extension). */
export function isMissingFunctionError(err: unknown): boolean {
  return err instanceof Error && /Could not find public function|Could not find function/i.test(err.message);
}

/** True for failures caused by connectivity rather than the request itself. */
export function isNetworkError(err: unknown): boolean {
  return err instanceof Error && /network|fetch failed|timed? ?out|offline|websocket/i.test(err.message);
}
