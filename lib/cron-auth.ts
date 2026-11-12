export function isValidCronAuthorization(
  cronSecret: string | undefined,
  authorization: string | null,
): boolean {
  return Boolean(cronSecret) && authorization === `Bearer ${cronSecret}`;
}
