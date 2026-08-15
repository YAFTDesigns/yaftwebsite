// TypeScript's catch clauses are correctly typed as `unknown`, not
// `any` -- what actually threw could be an Error, a Postgrest error
// object, a plain string, or anything else. This is the one place
// that narrows it down to a displayable/loggable string, instead of
// every catch block repeating its own `err instanceof Error ? ... :
// String(err)` (or worse, quietly typing the catch param `any` to
// avoid the question entirely).
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return String(err);
}
