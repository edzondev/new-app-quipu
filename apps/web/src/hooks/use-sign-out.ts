import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";
import type { AuthError } from "#/lib/auth-errors";

const END_SESSIONS = {
	current: () => authClient.signOut(),
	all: () => authClient.revokeSessions(),
};

/** Ends this session or all of them, then drops the cache and goes to sign-in. */
export function useSignOut(scope: keyof typeof END_SESSIONS) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	return useMutation<void, NonNullable<AuthError>>({
		mutationFn: async () => {
			const { error } = await END_SESSIONS[scope]();
			if (error) throw error;
		},
		onSuccess: async () => {
			queryClient.clear();
			await navigate({ to: "/sign-in" });
		},
	});
}
