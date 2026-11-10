import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState, useSearch } from "@tanstack/react-router";
import { MenuIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Drawer,
	DrawerHeader,
	DrawerPanel,
	DrawerPopup,
	DrawerTitle,
	DrawerTrigger,
} from "#/components/ui/drawer";
import {
	Menu,
	MenuGroup,
	MenuGroupLabel,
	MenuItem,
	MenuLinkItem,
	MenuPopup,
	MenuRadioGroup,
	MenuRadioItem,
	MenuSeparator,
	MenuTrigger,
} from "#/components/ui/menu";
import { SegmentedControl, SegmentedControlItem } from "#/components/ui/segmented-control";
import { useSignOut } from "#/hooks/use-sign-out";
import { useReadOnlyGate } from "#/modules/household/use-read-only-gate";
import { getAuthErrorMessage } from "#/lib/auth-errors";
import { setTheme, THEMES, useTheme } from "#/lib/theme";
import { useRegister } from "#/modules/register/register-dialog";

// The menu items are 44 px tall on touch screens.
const tapTarget = "pointer-coarse:min-h-11";
const spaceItem = "h-11 rounded-[22px] px-4 text-sm font-semibold sm:h-11 sm:text-sm";
const navLink = "flex h-11 items-center rounded-[22px] px-[18px] text-[15px] font-semibold";

const NAV_LINKS = [
	{ to: "/home", label: "Inicio" },
	{ to: "/movements", label: "Movimientos" },
	{ to: "/progress", label: "Progreso" },
	{ to: "/savings", label: "Ahorros" },
	{ to: "/commitments", label: "Compromisos" },
] as const;

function NavLinks({ onSelect }: { onSelect?: () => void }) {
	const { space } = useSearch({ from: "/_app" });
	// Progreso only knows Personal: in Nuestro espacio the link would change space without saying so.
	return NAV_LINKS.filter(({ to }) => to !== "/progress" || !space).map(({ to, label }) => (
		<Link
			key={to}
			to={to}
			onClick={onSelect}
			activeProps={{ className: "bg-muted text-foreground" }}
			inactiveProps={{ className: "text-muted-foreground" }}
			className={navLink}
		>
			{label}
		</Link>
	));
}

/**
 * One pill that slides: the indicator follows whichever item has `aria-current`. `exact` matters:
 * without it the Personal link, whose search is empty, is "active" in every space and the pill
 * stays put. `preload="render"` loads the data of the other space as soon as the bar shows, so
 * switching is instant.
 */
function SpaceSwitch({ onSelect }: { onSelect?: () => void }) {
	const { space } = useSearch({ from: "/_app" });

	return (
		<SegmentedControl
			role="tablist"
			aria-label="Espacio"
			className="rounded-3xl p-0.5 [&_[data-slot=segmented-control-indicator]]:rounded-[22px]"
		>
			<SegmentedControlItem
				className={spaceItem}
				render={
					<Link
						to="."
						role="tab"
						aria-selected={!space}
						aria-current={space ? undefined : "page"}
						search={(prev) => ({ ...prev, space: undefined })}
						activeOptions={{ exact: true }}
						preload="render"
						onClick={onSelect}
					/>
				}
			>
				Personal
			</SegmentedControlItem>
			<SegmentedControlItem
				className={spaceItem}
				render={
					<Link
						to="."
						role="tab"
						aria-selected={space === "household"}
						aria-current={space === "household" ? "page" : undefined}
						search={(prev) => ({ ...prev, space: "household" })}
						activeOptions={{ exact: true }}
						preload="render"
						onClick={onSelect}
					/>
				}
			>
				Nuestro espacio
			</SegmentedControlItem>
		</SegmentedControl>
	);
}

export function AppBar() {
	const profile = useQuery(convexQuery(api.profiles.myProfile, {}));
	const signOut = useSignOut("current");
	const theme = useTheme();
	const openRegister = useRegister();
	const gate = useReadOnlyGate();
	const { space } = useSearch({ from: "/_app" });
	// Personal without a plan has no sobres to register in.
	const canRegister = space === "household" || profile.data?.plan !== null;
	// The menu is open only for the address it was opened on, so back and forward close it
	// without an effect. Choosing the page you are already on has to close it by hand.
	const href = useRouterState({ select: (state) => state.location.href });
	const [menuOpenAt, setMenuOpenAt] = useState<string | null>(null);
	const closeMenu = () => setMenuOpenAt(null);
	// Spreading a string walks code points, so an emoji at the start stays whole.
	const [first = "?"] = profile.data?.name.trim() ?? "";
	const initial = first.toUpperCase();

	return (
		<header className="border-b border-input bg-background">
			<nav
				aria-label="Principal"
				className="mx-auto flex min-h-16 w-full max-w-280 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-2"
			>
				<div className="flex items-center gap-2">
					<Drawer
						position="left"
						open={menuOpenAt === href}
						onOpenChange={(open) => setMenuOpenAt(open ? href : null)}
					>
						<DrawerTrigger
							render={
								<Button
									variant="ghost"
									size="icon-xl"
									aria-label="Menú"
									className="-ms-2 lg:hidden"
								/>
							}
						>
							<MenuIcon />
						</DrawerTrigger>
						<DrawerPopup variant="straight" showCloseButton>
							<DrawerHeader>
								<DrawerTitle>Menú</DrawerTitle>
							</DrawerHeader>
							<DrawerPanel className="flex flex-col gap-4">
								<SpaceSwitch onSelect={closeMenu} />
								<nav aria-label="Secciones" className="flex flex-col gap-1">
									<NavLinks onSelect={closeMenu} />
								</nav>
							</DrawerPanel>
						</DrawerPopup>
					</Drawer>
					<Link
						to="/home"
						className="font-heading text-[21px] font-medium tracking-tight text-foreground"
					>
						Quipu
					</Link>
				</div>

				<div className="hidden gap-1 lg:flex">
					<NavLinks />
				</div>

				<div className="flex items-center gap-2.5">
					<div className="hidden lg:block">
						<SpaceSwitch />
					</div>

					{canRegister ? (
						<Button type="button" onClick={() => openRegister()} className="rounded-full" {...gate}>
							+ Registrar
						</Button>
					) : null}

					<Menu>
						<MenuTrigger
							aria-label="Cuenta"
							className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{initial}
						</MenuTrigger>
						<MenuPopup sideOffset={8} align="end">
							<MenuLinkItem
								render={<Link to="/settings" search={{ space: undefined }} />}
								className={tapTarget}
							>
								Ajustes
							</MenuLinkItem>
							<MenuSeparator />
							<MenuGroup>
								<MenuGroupLabel>Tema</MenuGroupLabel>
								<MenuRadioGroup
									value={theme}
									onValueChange={(value, { event }) => {
										const next = THEMES.find((option) => option.value === value);
										if (next) setTheme(next.value, event);
									}}
								>
									{THEMES.map((option) => (
										<MenuRadioItem
											key={option.value}
											value={option.value}
											closeOnClick={false}
											className={tapTarget}
										>
											{option.label}
										</MenuRadioItem>
									))}
								</MenuRadioGroup>
							</MenuGroup>
							<MenuSeparator />
							<MenuItem
								closeOnClick={false}
								disabled={signOut.isPending}
								className={tapTarget}
								onClick={() => signOut.mutate()}
							>
								{signOut.isPending ? "Saliendo…" : "Cerrar sesión"}
							</MenuItem>
							{signOut.isError ? (
								<p role="alert" className="px-2 py-1.5 text-xs text-warning-foreground">
									{getAuthErrorMessage(signOut.error)}
								</p>
							) : null}
						</MenuPopup>
					</Menu>
				</div>
			</nav>
		</header>
	);
}
