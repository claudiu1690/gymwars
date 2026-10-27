// A failed response does not establish that the write failed. Keep its exact
// request ID/body for network failures and server errors so receipts can recover it.
export function isDefiniteRejection(error) {
  return (
    Number.isInteger(error?.status) && error.status >= 400 && error.status < 500
  );
}

// LAN HTTP previews do not expose randomUUID (a secure-context API).
// getRandomValues remains available and keeps action receipt IDs cryptographically random.
export function requestId(cryptoSource = globalThis.crypto) {
  if (typeof cryptoSource?.randomUUID === "function")
    return cryptoSource.randomUUID();
  const bytes = cryptoSource.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((n) => n.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
