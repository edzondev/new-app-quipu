import { Menu } from "@base-ui/react/menu";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "@tanstack/react-router";
import { cn } from "cn";
import { Button } from "#/components/ui/button";
import { useSignOut } from "#/hooks/use-sign-out";
import { getAuthErrorMessage } from "#/lib/auth-errors";
import { setTheme, THEMES, useTheme } from "#/lib/theme";
import { useRegister } from "#/modules/register/register-dialog";

const menuItem =
	"flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm outline-none data-highlighted:bg-muted data-disabled:opacity-50";
const pill =
	"flex h-11 items-center rounded-[22px] px-4 text-sm font-semibold text-muted-foreground";
const pillOn = "bg-background text-foreground shadow-[0_1px_3px_rgba(29,22,16,0.12)]";
const navLink = "flex h-11 items-center rounded-[22px] px-[18px] text-[15px] font-semibold";

export function AppBar() {
	const { space } = useSearch({ from: "/_app" });
	const profile = useQuery(convexQuery(api.profiles.myProfile, {}));
	const signOut = useSignOut("current");
	const theme = useTheme();
	const openRegister = useRegister();
	// Spreading a string walks code points, so an emoji at the start stays whole.
	const [first = "?"] = profile.data?.name.trim() ?? "";
	const initial = first.toUpperCase();

	return (
		<header className="border-b border-input bg-background">
			<nav
				aria-label="Principal"
				className="mx-auto flex min-h-16 w-full max-w-[1120px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-2"
			>
				<Link
					to="/home"
					className="font-heading text-[21px] font-medium tracking-tight text-foreground"
				>
					Quipu
				</Link>

				<div className="flex gap-1">
					<Link
						to="/home"
						activeProps={{ className: "bg-muted text-foreground" }}
						inactiveProps={{ className: "text-muted-foreground" }}
						className={navLink}
					>
						Inicio
					</Link>
					<Link
						to="/movements"
						activeProps={{ className: "bg-muted text-foreground" }}
						inactiveProps={{ className: "text-muted-foreground" }}
						className={navLink}
					>
						Movimientos
					</Link>
					<Link
						to="/savings"
						activeProps={{ className: "bg-muted text-foreground" }}
						inactiveProps={{ className: "text-muted-foreground" }}
						className={navLink}
					>
						Ahorros
					</Link>
					<Link
						to="/commitments"
						activeProps={{ className: "bg-muted text-foreground" }}
						inactiveProps={{ className: "text-muted-foreground" }}
						className={navLink}
					>
						Compromisos
					</Link>
				</div>

				<div className="flex items-center gap-2.5">
					{profile.data?.hasHousehold ? (
						<div role="tablist" aria-label="Espacio" className="flex rounded-3xl bg-muted p-0.5">
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
					) : null}

					<Button type="button" onClick={() => openRegister()} className="rounded-full">
						+ Registrar
					</Button>

					<Menu.Root>
						<Menu.Trigger
							aria-label="Cuenta"
							className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{initial}
						</Menu.Trigger>
						<Menu.Portal>
							<Menu.Positioner sideOffset={8} align="end" className="z-50">
								<Menu.Popup className="min-w-44 rounded-xl border border-border bg-background p-1 shadow-md outline-none">
									<Menu.LinkItem
										render={<Link to="/settings" search={{ space: undefined }} />}
										className={menuItem}
									>
										Ajustes
									</Menu.LinkItem>
									<Menu.Separator className="my-1 h-px bg-border" />
									<Menu.Group>
										<Menu.GroupLabel className="px-3 py-1 text-xs text-muted-foreground">
											Tema
										</Menu.GroupLabel>
										<Menu.RadioGroup
											value={theme}
											onValueChange={(value, { event }) => {
												const next = THEMES.find((option) => option.value === value);
												if (next) setTheme(next.value, event);
											}}
										>
											{THEMES.map((option) => (
												<Menu.RadioItem
													key={option.value}
													value={option.value}
													closeOnClick={false}
													className={cn(menuItem, "justify-between")}
												>
													{option.label}
													<Menu.RadioItemIndicator aria-hidden>✓</Menu.RadioItemIndicator>
												</Menu.RadioItem>
											))}
										</Menu.RadioGroup>
									</Menu.Group>
									<Menu.Separator className="my-1 h-px bg-border" />
									<Menu.Item
										closeOnClick={false}
										disabled={signOut.isPending}
										className={menuItem}
										onClick={() => signOut.mutate()}
									>
										{signOut.isPending ? "Saliendo…" : "Cerrar sesión"}
									</Menu.Item>
									{signOut.isError ? (
										<p role="alert" className="px-3 py-1.5 text-xs text-warning-foreground">
											{getAuthErrorMessage(signOut.error)}
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
