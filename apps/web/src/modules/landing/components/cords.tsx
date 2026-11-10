import { cn } from "cn";

const CORDS = [
	{
		id: "n",
		color: "text-envelope-needs",
		d: "M-80 100 C200 130 290 360 630 430 S1110 540 1490 720",
	},
	{
		id: "g",
		color: "text-envelope-wants",
		d: "M-80 175 C200 200 320 410 650 480 S1140 600 1490 765",
	},
	{
		id: "a",
		color: "text-envelope-savings",
		d: "M-80 250 C220 270 350 460 670 530 S1150 665 1490 810",
	},
] as const;

/** The three cords of the landing. Position and size come from the caller. */
export function Cords({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 1400 760"
			aria-hidden="true"
			className={cn(
				"pointer-events-none absolute left-1/2 -translate-x-1/2 overflow-visible",
				className,
			)}
		>
			{CORDS.map(({ id, color, d }) => (
				<g key={id} className={color}>
					<path d={d} fill="none" stroke="currentColor" strokeWidth="22" strokeLinecap="round" />
					<path
						d={d}
						fill="none"
						className="stroke-background opacity-25"
						strokeWidth="2"
						strokeDasharray="2 7"
					/>
				</g>
			))}
		</svg>
	);
}
