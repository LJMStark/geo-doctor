import type { FetchResult } from '../types.js';

const USER_AGENT =
  'Mozilla/5.0 (compatible; GEODoctor/0.1; +https://github.com/geo-doctor/geo-doctor)';

const MAX_BODY_BYTES = 2 * 1024 * 1024;

export const DEFAULT_TIMEOUT_MS = 15_000;

/** Fetch a URL with timeout, size cap and friendly error capture. Never throws. */
export async function fetchUrl(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<FetchResult> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',
        'accept-language': 'en,zh;q=0.9',
      },
    });
    const body = await readBodyCapped(res, MAX_BODY_BYTES);
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    return {
      url,
      finalUrl: res.url || url,
      ok: res.ok,
      status: res.status,
      redirected: res.redirected,
      responseTimeMs: Date.now() - started,
      headers,
      body,
    };
  } catch (err) {
    return {
      url,
      finalUrl: url,
      ok: false,
      status: 0,
      redirected: false,
      responseTimeMs: Date.now() - started,
      headers: {},
      body: '',
      error: describeFetchError(err),
    };
  }
}

async function readBodyCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    chunks.push(value);
    if (total >= maxBytes) {
      await reader.cancel();
      break;
    }
  }
  const merged = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const slice = chunk.subarray(0, Math.min(chunk.byteLength, merged.byteLength - offset));
    merged.set(slice, offset);
    offset += slice.byteLength;
    if (offset >= merged.byteLength) break;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
}

function describeFetchError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') return 'timeout';
    const cause = (err as { cause?: { code?: string } }).cause;
    if (cause?.code) return cause.code;
    return err.message;
  }
  return String(err);
}
