import { useMutation } from "@tanstack/react-query";
import { authClient, enterApp } from "#/lib/auth-client";
import type { AuthError } from "#/lib/auth-errors";

const END_SESSIONS = {
	current: () => authClient.signOut(),
	all: () => authClient.revokeSessions(),
};

/** Ends this session or all of them, then reloads into sign-in (see enterApp). */
export function useSignOut(scope: keyof typeof END_SESSIONS) {
	return useMutation<void, NonNullable<AuthError>>({
		mutationFn: async () => {
			const { error } = await END_SESSIONS[scope]();
			if (error) throw error;
			await enterApp("/sign-in");
		},
	});
}
