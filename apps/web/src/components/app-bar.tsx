import { convexQuery } from "@convex-dev/react-query";
import { Menu } from "@base-ui/react/menu";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { cn } from "cn";
import { useState } from "react";
import { authClient } from "#/lib/auth-client";
import { getAuthErrorMessage } from "#/lib/auth-errors";

const pill =
	"flex h-[30px] items-center rounded-full px-3 text-[12.5px] font-semibold text-muted-foreground";
const pillOn = "bg-background text-foreground shadow-[0_1px_3px_rgba(29,22,16,0.12)]";

export function AppBar() {
	const { space } = useSearch({ from: "/_app" });
	const profile = useQuery(convexQuery(api.profiles.myProfile, {}));
	const navigate = useNavigate();
	const [signingOut, setSigningOut] = useState(false);
	const [signOutError, setSignOutError] = useState<string | null>(null);
	const initial = (profile.data?.name?.trim().charAt(0) || "?").toUpperCase();

	async function signOut() {
		setSignOutError(null);
		setSigningOut(true);
		const { error } = await authClient.signOut();
		setSigningOut(false);
		if (error) {
			setSignOutError(getAuthErrorMessage(error));
			return;
		}
		await navigate({ to: "/sign-in" });
	}

	return (
		<header className="border-b border-border/80 bg-background">
			<nav
				aria-label="Principal"
				className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between gap-4 px-6"
			>
				<Link
					to="/home"
					className="font-heading text-[21px] font-medium tracking-tight text-foreground"
				>
					Quipu
				</Link>

				<Link
					to="/home"
					activeProps={{ className: "bg-muted text-foreground" }}
					inactiveProps={{ className: "text-muted-foreground" }}
					className="flex h-9 items-center rounded-full px-3.5 text-[13.5px] font-medium"
				>
					Inicio
				</Link>

				<div className="flex items-center gap-3">
					{profile.data?.hasHousehold ? (
						<div
							role="tablist"
							aria-label="Espacio"
							className="flex gap-0.5 rounded-full bg-muted p-[3px]"
						>
							<Link
								to="."
								role="tab"
								aria-selected={!space}
								search={(prev) => ({ ...prev, space: undefined })}
								className={cn(pill, !space && pillOn)}
							>
								Personal
							</Link>
							<Link
								to="."
								role="tab"
								aria-selected={space === "household"}
								search={(prev) => ({ ...prev, space: "household" })}
								className={cn(pill, space === "household" && pillOn)}
							>
								Nuestro espacio
							</Link>
						</div>
					) : (
						<span className="text-[12.5px] font-semibold text-muted-foreground">Personal</span>
					)}

					<Menu.Root>
						<Menu.Trigger
							aria-label="Cuenta"
							className="flex size-9 items-center justify-center rounded-full bg-teal-700/15 text-sm font-semibold text-teal-800 outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{initial}
						</Menu.Trigger>
						<Menu.Portal>
							<Menu.Positioner sideOffset={8} align="end" className="z-50">
								<Menu.Popup className="min-w-44 rounded-xl border border-border bg-background p-1 shadow-md outline-none">
									<Menu.Item
										closeOnClick={false}
										disabled={signingOut}
										className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none data-highlighted:bg-muted data-disabled:opacity-50"
										onClick={() => {
											void signOut();
										}}
									>
										{signingOut ? "Saliendo…" : "Cerrar sesión"}
									</Menu.Item>
									{signOutError ? (
										<p role="alert" className="px-3 py-1.5 text-xs text-warning-foreground">
											{signOutError}
										</p>
									) : null}
								</Menu.Popup>
							</Menu.Positioner>
						</Menu.Portal>
					</Menu.Root>
				</div>
			</nav>
		</header>
	);
}
