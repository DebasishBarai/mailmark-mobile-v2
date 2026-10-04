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
    if (typeof data === 'string' && data.length > 0) return friendlySendError(data);
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      return friendlySendError(data.message);
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
    return friendlySendError(cleaned);
  }
  return fallback;
}

/**
 * Plain-English wording for the send refusals in convex/ses.ts, ported
 * verbatim in behaviour from friendlySendError in lib/sendErrors.ts on the
 * website so both clients say the same thing.
 *
 * Each pattern matches one message the server throws; anything else is
 * returned unchanged, so a new or reworded server message still reaches the
 * person in its original words.
 */
export function friendlySendError(message: string): string {
  const warming = message.match(/^Warming limit reached for today \(([\d,]+) emails on day (\d+) of (\d+)\)/);
  if (warming) {
    const [, limit, day, total] = warming;
    return `Your domain is still in its slow start, which keeps your emails out of spam. Today's limit of ${limit} emails is used up (day ${day} of ${total}), so sending picks up again tomorrow.`;
  }

  const monthly = message.match(/^Monthly email limit reached \(([\d,.\s]+) emails\)/);
  if (monthly) {
    return `You have sent your ${monthly[1].trim()} emails for this month, which is your plan's limit. To send more now, upgrade your plan on the Billing page.`;
  }

  const unverified = message.match(/^Could not verify (.+) right now\. Nothing was sent/);
  if (unverified) {
    return `We could not check ${unverified[1]} just now, so nothing was sent. Please try again in a minute.`;
  }

  const ineligible = message.match(/^No eligible recipients\.\s*([\s\S]*)$/);
  if (ineligible) {
    const parts = ineligible[1]
      .split('; ')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const at = part.indexOf(': ');
        if (at === -1) return part;
        const email = part.slice(0, at);
        const reason = part.slice(at + 2);
        return `${email} (${REASON_TEXT[reason] ?? reason})`;
      });
    return parts.length > 0
      ? `Nothing was sent. None of these addresses can get this email: ${parts.join(', ')}.`
      : 'Nothing was sent. None of these addresses can get this email.';
  }

  return message;
}

// Keyed by the wording in REASON_TEXT in convex/lib/sendPolicy.ts on the
// website, which is what describeRefusal puts after each address.
const REASON_TEXT: Record<string, string> = {
  'previously hard bounced': 'an earlier email to it bounced back',
  'reported an earlier message as spam': 'they marked an earlier email as spam',
  'on your suppression list': 'it is on your do-not-email list',
  unsubscribed: 'they unsubscribed',
  'invalid address': 'this address does not exist',
  'disposable address': 'it is a temporary throwaway address',
  'catch-all domain, which your sending policy blocks': 'we could not confirm this address exists',
  'could not be confirmed, and your sending policy blocks unconfirmed addresses': 'we could not confirm this address exists',
  'not a valid email address': 'it is not a complete email address',
  'the verifier could not be reached': 'we could not check it just now',
  'still being verified': 'we are still checking it',
};

/** True when the backend has no such public function (e.g. the optional mobile extension). */
export function isMissingFunctionError(err: unknown): boolean {
  return err instanceof Error && /Could not find public function|Could not find function/i.test(err.message);
}

/** True for failures caused by connectivity rather than the request itself. */
export function isNetworkError(err: unknown): boolean {
  return err instanceof Error && /network|fetch failed|timed? ?out|offline|websocket/i.test(err.message);
}
