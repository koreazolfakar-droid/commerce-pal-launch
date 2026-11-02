/**
 * Limits the actual streamed bytes of a mutation request, even when a client
 * omits or forges Content-Length. The original Request body remains readable
 * by the application; only a bounded clone is inspected.
 *
 * Do not await cancel() on a tee branch: the platform may wait until the
 * application's original branch also closes.
 */
export async function exceedsMutationBodyLimit(request: Request, maxBytes: number): Promise<boolean> {
  if (!request.body) return false;

  const inspection = request.clone();
  const reader = inspection.body?.getReader();
  if (!reader) return false;

  let totalBytes = 0;
  let exceeded = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        exceeded = true;
        break;
      }
    }
    return exceeded;
  } finally {
    if (exceeded) {
      void reader.cancel("Payload exceeds request size limit").catch(() => undefined);
    }
    reader.releaseLock();
  }
}
