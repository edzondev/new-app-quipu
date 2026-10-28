import { Link } from "@tanstack/react-router";

export function QuipuHeader() {
	return (
		<header className="mx-auto flex w-full max-w-360 items-center px-7 py-8 sm:px-12 sm:py-10">
			<Link to="/" aria-label="Quipu, entrada" className="inline-flex items-center gap-2.5">
				<svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden="true">
					<path d="M3 6h22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
					<path
						d="M8 6v10"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						opacity="0.45"
					/>
					<path d="M14 6v16" stroke="#c45c2a" strokeWidth="1.8" strokeLinecap="round" />
					<path
						d="M20 6v8"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						opacity="0.45"
					/>
					<circle cx="8" cy="16" r="1.9" fill="currentColor" opacity="0.45" />
					<circle cx="14" cy="22" r="2.4" fill="#c45c2a" />
					<circle cx="20" cy="14" r="1.9" fill="currentColor" opacity="0.45" />
				</svg>
				<span className="text-2xl font-medium tracking-tight">Quipu</span>
			</Link>
		</header>
	);
}
