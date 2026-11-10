import { Link } from "@tanstack/react-router";
import { MenuIcon, MoonIcon } from "lucide-react";
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
import { setTheme } from "#/lib/theme";
import { NAV_LINKS } from "../landing-data";
import { Brand, SignUpButton, wrap } from "./preview-parts";

export function LandingNav() {
	const [open, setOpen] = useState(false);

	return (
		<header className={wrap}>
			<nav
				aria-label="Navegación principal"
				className="flex h-19 items-center justify-between gap-4 border-b border-border"
			>
				<a href="#contenido" aria-label="Quipu, inicio">
					<Brand />
				</a>
				<div className="hidden items-center gap-4 md:flex">
					{NAV_LINKS.map(({ href, label }) => (
						<Button
							key={href}
							variant="ghost"
							size="xl"
							render={<a href={href} />}
							className="px-2 text-xs font-semibold"
						>
							{label}
						</Button>
					))}
				</div>
				<div className="flex items-center gap-1.5 sm:gap-3">
					<Button
						variant="ghost"
						size="xl"
						render={<Link to="/sign-in" />}
						className="px-2 text-xs font-semibold"
					>
						Entrar
					</Button>
					<SignUpButton
						size="xl"
						arrow={false}
						className="hidden rounded-full px-5 text-xs sm:inline-flex"
					>
						Empezar gratis
					</SignUpButton>
					<Button
						variant="ghost"
						size="icon-xl"
						aria-label="Cambiar tema"
						className="rounded-full"
						onClick={(event) =>
							setTheme(
								document.documentElement.classList.contains("dark") ? "light" : "dark",
								event.nativeEvent,
							)
						}
					>
						<MoonIcon />
					</Button>
					<Drawer position="left" open={open} onOpenChange={setOpen}>
						<DrawerTrigger
							render={
								<Button
									variant="ghost"
									size="icon-xl"
									aria-label="Menú de navegación"
									className="rounded-full md:hidden"
								/>
							}
						>
							<MenuIcon />
						</DrawerTrigger>
						<DrawerPopup variant="straight" showCloseButton>
							<DrawerHeader>
								<DrawerTitle>Menú</DrawerTitle>
							</DrawerHeader>
							<DrawerPanel>
								<nav aria-label="Navegación móvil" className="flex flex-col gap-1">
									{NAV_LINKS.map(({ href, label }) => (
										<Button
											key={href}
											variant="ghost"
											size="xl"
											render={<a href={href} />}
											onClick={() => setOpen(false)}
											className="justify-start px-3 text-[15px] font-semibold"
										>
											{label}
										</Button>
									))}
									<SignUpButton
										variant="ghost"
										size="xl"
										className="mt-1 justify-start rounded-none border-0 border-t border-border px-3 text-[15px] font-semibold"
									>
										Empezar gratis
									</SignUpButton>
								</nav>
							</DrawerPanel>
						</DrawerPopup>
					</Drawer>
				</div>
			</nav>
		</header>
	);
}
