const TOLERANCE_SECONDS = 5 * 60;
const SECRET_PREFIX = "whsec_";

function decodeBase64(text: string) {
	try {
		return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
	} catch {
		return null;
	}
}

/**
 * Standard Webhooks check (Polar API 2026-04): the key is the base64 secret without
 * `whsec_`, the signed text is `id.timestamp.body`, and the header may hold several
 * `v1,<signature>` entries (key rotation). Any match passes.
 */
export async function verifyWebhook(secret: string, headers: Headers, body: string, nowMs: number) {
	const id = headers.get("webhook-id");
	const timestamp = headers.get("webhook-timestamp");
	const signatures = headers.get("webhook-signature");
	const key = decodeBase64(secret.startsWith(SECRET_PREFIX) ? secret.slice(6) : secret);
	if (!id || !timestamp || !signatures || !key) return false;

	const seconds = Number(timestamp);
	if (!Number.isInteger(seconds) || Math.abs(nowMs / 1000 - seconds) > TOLERANCE_SECONDS) {
		return false;
	}

	const hmacKey = await crypto.subtle.importKey(
		"raw",
		key,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"],
	);
	const signed = new TextEncoder().encode(`${id}.${timestamp}.${body}`);
	for (const entry of signatures.split(" ")) {
		const [version, signature] = entry.split(",");
		const bytes = version === "v1" && signature ? decodeBase64(signature) : null;
		if (bytes && (await crypto.subtle.verify("HMAC", hmacKey, bytes, signed))) return true;
	}
	return false;
}
