const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const HIBP_TIMEOUT_MS = 8_000;

function toUpperHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  )
    .join("")
    .toUpperCase();
}

async function sha1Hex(value: string) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure password screening is unavailable in this browser.");
  }

  const encoded = new TextEncoder().encode(value);
  return toUpperHex(await globalThis.crypto.subtle.digest("SHA-1", encoded));
}

export type PwnedPasswordResult = {
  compromised: boolean;
  occurrenceCount: number;
};

/**
 * Checks HIBP Pwned Passwords using the k-anonymity range API.
 *
 * The plaintext password and complete SHA-1 digest never leave the browser.
 * Only the first five hexadecimal characters of the digest are requested.
 * Response padding is enabled to reduce response-size side channels.
 */
export async function checkPwnedPassword(
  password: string,
): Promise<PwnedPasswordResult> {
  const digest = await sha1Hex(password);
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), HIBP_TIMEOUT_MS);

  try {
    const response = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      method: "GET",
      headers: {
        Accept: "text/plain",
        "Add-Padding": "true",
      },
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HIBP password screening failed with status ${response.status}.`);
    }

    const body = await response.text();
    for (const line of body.split(/\r?\n/)) {
      const separator = line.indexOf(":");
      if (separator <= 0) continue;

      const candidateSuffix = line.slice(0, separator).trim().toUpperCase();
      if (candidateSuffix !== suffix) continue;

      const count = Number.parseInt(line.slice(separator + 1).trim(), 10);
      const occurrenceCount = Number.isFinite(count) && count > 0 ? count : 0;
      return {
        compromised: occurrenceCount > 0,
        occurrenceCount,
      };
    }

    return { compromised: false, occurrenceCount: 0 };
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw new Error("Password breach screening timed out. Try again.");
    }
    throw cause instanceof Error
      ? cause
      : new Error("Password breach screening is temporarily unavailable.");
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function assertDashboardPasswordNotPwned(password: string) {
  let result: PwnedPasswordResult;

  try {
    result = await checkPwnedPassword(password);
  } catch (cause) {
    console.warn(
      "[dashboard-security] HIBP password screening unavailable",
      cause instanceof Error ? cause.message : cause,
    );
    throw new Error(
      "Security check is temporarily unavailable. Your password was not changed. Try again shortly.",
    );
  }

  if (result.compromised) {
    throw new Error(
      "This password appears in known breach data. Choose a unique password that you have never used elsewhere.",
    );
  }
}
