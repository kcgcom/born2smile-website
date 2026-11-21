export function streamAdminUpdates<T>(
  load: (emit: (update: T) => void) => Promise<unknown>,
  headers: HeadersInit,
  onError?: (error: unknown) => void,
) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/x-ndjson");
  responseHeaders.set("Vary", "Authorization, Accept");
  const encoder = new TextEncoder();
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      void load(update => {
        if (!cancelled) controller.enqueue(encoder.encode(JSON.stringify({ update }) + "\n"));
      }).then(() => {
        if (!cancelled) {
          controller.enqueue(encoder.encode('{"done":true}\n'));
          controller.close();
        }
      }).catch(error => {
        onError?.(error);
        if (!cancelled) controller.error(error);
      });
    },
    cancel() { cancelled = true; },
  });
  return new Response(body, { headers: responseHeaders });
}
