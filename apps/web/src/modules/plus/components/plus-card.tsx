import type { LucideIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useRef } from "react";
import { QuipuMark } from "#/components/quipu-mark";
import { DialogDescription, DialogPanel, DialogPopup, DialogTitle } from "#/components/ui/dialog";

export const PLUS_CARD_BUTTON = "h-12 w-full rounded-full sm:h-12";

export type PlusRow = { Icon: LucideIcon; name: string; detail: string };

/** B1 and T1: a centered card under the envelope cords, with the plan pill and what it brings. */
export function PlusCard({
	pill,
	title,
	description,
	rows,
	note,
	foot,
	finalFocus,
	children,
}: {
	pill: string;
	title: string;
	description: string;
	rows: PlusRow[];
	note?: ReactNode;
	foot?: string;
	finalFocus?: ComponentProps<typeof DialogPopup>["finalFocus"];
	children: ReactNode;
}) {
	const titleRef = useRef<HTMLHeadingElement>(null);
	return (
		<DialogPopup
			bottomStickOnMobile={false}
			initialFocus={titleRef}
			finalFocus={finalFocus}
			className="max-w-110 rounded-3xl before:rounded-[inherit] md:rounded-[28px]"
			closeProps={{
				className:
					"absolute start-3 top-3 size-11 rounded-full border border-border bg-popover sm:size-11",
			}}
		>
			<DialogPanel className="p-0" scrollFade={false}>
				<div className="relative grid h-29 place-items-center overflow-hidden rounded-t-3xl bg-muted md:h-32 md:rounded-t-[28px]">
					<Cords />
					<span className="relative grid size-19.5 place-items-center rounded-full bg-popover shadow-md/5">
						<QuipuMark className="h-10 w-11" />
					</span>
				</div>
				<div className="px-6 pt-6 pb-6 md:px-7.5 md:pb-7">
					<span className="mb-3 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
						{pill}
					</span>
					<DialogTitle
						ref={titleRef}
						tabIndex={-1}
						className="font-sans text-[31px] leading-tight font-semibold tracking-tight outline-none md:text-[34px]"
					>
						{title}
					</DialogTitle>
					<DialogDescription className="mt-3 text-[13px] leading-relaxed">
						{description}
					</DialogDescription>
					<ul className="mt-5.5 grid gap-4">
						{rows.map(({ Icon, name, detail }) => (
							<li key={name} className="flex items-start gap-3 text-[13px]">
								<Icon aria-hidden className="mt-px size-5 shrink-0 text-envelope-savings" />
								<span className="min-w-0">
									{name}
									<span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
								</span>
							</li>
						))}
					</ul>
					{note ? (
						<p className="mt-5.5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
							{note}
						</p>
					) : null}
					<div className="mt-6 grid gap-2.5">{children}</div>
					{foot ? <p className="mt-3.5 text-center text-xs text-muted-foreground">{foot}</p> : null}
				</div>
			</DialogPanel>
		</DialogPopup>
	);
}

/** Three cords in the envelope colors, each with its knot. */
function Cords() {
	const cords = [
		[
			"stroke-envelope-needs fill-envelope-needs",
			"M-45 50C40-45 65 15 96 66s45 54 68 12S200-16 250 2s110 45 240 0",
			108,
			83,
			-28,
		],
		[
			"stroke-envelope-wants fill-envelope-wants",
			"M-45 76C35-17 56 46 80 91s50 57 77 9S204 10 249 26s110 45 240 0",
			353,
			51,
			10,
		],
		[
			"stroke-envelope-savings fill-envelope-savings",
			"M-45 102C27 7 48 71 66 116s49 57 78 11S207 36 252 52s110 45 240 0",
			352,
			77,
			0,
		],
	] as const;
	return (
		<svg
			aria-hidden
			viewBox="0 0 440 128"
			preserveAspectRatio="xMidYMid slice"
			className="absolute inset-0 size-full"
		>
			{cords.map(([color, d, x, y, turn]) => (
				<g key={d} className={color}>
					<path d={d} fill="none" strokeWidth={10} strokeLinecap="round" />
					<ellipse cx={x} cy={y} rx={8} ry={10} transform={`rotate(${turn} ${x} ${y})`} />
				</g>
			))}
		</svg>
	);
}
