import { Link } from "@tanstack/react-router";
import { QuipuMark } from "#/components/quipu-mark";

export function QuipuHeader({ children }: { children?: React.ReactNode }) {
	return (
		<header className="mx-auto flex w-full max-w-360 items-center justify-between px-7 py-8 sm:px-12 sm:py-10">
			<Link
				to="/"
				aria-label="Quipu, entrada"
				className="inline-flex min-h-11 items-center gap-2.5"
			>
				<QuipuMark className="h-7 w-8" />
				<span className="text-2xl font-medium tracking-tight">Quipu</span>
			</Link>
			{children}
		</header>
	);
}
