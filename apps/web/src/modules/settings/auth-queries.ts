import { queryOptions } from "@tanstack/react-query";
import { authClient } from "#/lib/auth-client";
import type { AuthError } from "#/lib/auth-errors";

/** Better Auth returns `{ data, error }`; TanStack Query wants a value or a throw. */
export async function unwrap<T>(
	request: Promise<{ data: T | null; error: NonNullable<AuthError> | null }>,
): Promise<T> {
	const { data, error } = await request;
	if (error) throw error;
	if (data === null) throw new Error("Empty auth response");
	return data;
}

async function loadSessions() {
	const [sessions, current] = await Promise.all([
		unwrap(authClient.listSessions()),
		unwrap(authClient.getSession()),
	]);
	return { sessions, currentId: current.session.id };
}

export type SessionList = Awaited<ReturnType<typeof loadSessions>>;
export type Passkey = Awaited<ReturnType<typeof loadPasskeys>>[number];

function loadPasskeys() {
	return unwrap(authClient.passkey.listUserPasskeys());
}

// A failed request (for example SESSION_NOT_FRESH) will not change by retrying it.
export const sessionsQuery = queryOptions<SessionList, NonNullable<AuthError>>({
	queryKey: ["auth", "sessions"],
	retry: false,
	queryFn: loadSessions,
});

export const passkeysQuery = queryOptions<Passkey[], NonNullable<AuthError>>({
	queryKey: ["auth", "passkeys"],
	retry: false,
	queryFn: loadPasskeys,
});
