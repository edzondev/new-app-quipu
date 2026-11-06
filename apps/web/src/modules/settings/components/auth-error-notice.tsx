import { Button } from "#/components/ui/button";
import { useSignOut } from "#/hooks/use-sign-out";
import { type AuthError, getAuthErrorMessage } from "#/lib/auth-errors";

/**
 * Listing sessions and adding a key need a session younger than 24 h. When it is older, the only
 * way forward is to sign in again.
 */
export function AuthErrorNotice({
	error,
	goal,
}: {
	error: NonNullable<AuthError>;
	/** Finishes "…vuelve a iniciar sesión para {goal}". */
	goal: string;
}) {
	const signOut = useSignOut("current");
	if (error.code !== "SESSION_NOT_FRESH") {
		return (
			<p role="alert" className="text-xs text-warning-foreground">
				{getAuthErrorMessage(error)}
			</p>
		);
	}
	return (
		<div role="alert" className="flex flex-col items-start gap-2">
			<p className="text-xs text-warning-foreground">
				Por seguridad, vuelve a iniciar sesión para {goal}
			</p>
			<Button
				type="button"
				variant="outline"
				size="xl"
				className="rounded-full"
				loading={signOut.isPending}
				onClick={() => signOut.mutate()}
			>
				Volver a iniciar sesión
			</Button>
			{signOut.isError ? (
				<p className="text-xs text-warning-foreground">{getAuthErrorMessage(signOut.error)}</p>
			) : null}
		</div>
	);
}
