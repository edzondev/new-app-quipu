import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode, Ref } from "react";
import { QuipuMark } from "#/components/quipu-mark";
import { DialogDescription, DialogPopup, DialogTitle } from "#/components/ui/dialog";

export const PLUS_CARD_BUTTON = "h-12 w-full rounded-full sm:h-12";

export type PlusRow = { Icon: LucideIcon; name: string; detail: string };

/** B1 and T1: a centered card under the envelope cords. It scrolls inside on short screens. */
export function PlusCard({
	initialFocus,
	finalFocus,
	corner,
	className,
	children,
}: {
	initialFocus: ComponentProps<typeof DialogPopup>["initialFocus"];
	finalFocus?: ComponentProps<typeof DialogPopup>["finalFocus"];
	/** Sits over the cords on the right, across from the X. */
	corner?: ReactNode;
	className?: string;
	children: ReactNode;
}) {
	return (
		<DialogPopup
			bottomStickOnMobile={false}
			initialFocus={initialFocus}
			finalFocus={finalFocus}
			// @starting-style: it also enters when it mounts already open (B1), which Base UI does not animate.
			className={cn(
				"max-w-110 overflow-y-auto rounded-3xl before:rounded-[inherit] starting:opacity-0 md:rounded-[28px] motion-safe:sm:starting:scale-98",
				className,
			)}
			closeProps={{
				className:
					"absolute start-3 top-3 size-11 rounded-full border border-border bg-popover sm:size-11",
			}}
		>
			<div className="relative grid h-29 shrink-0 place-items-center overflow-hidden rounded-t-[inherit] bg-muted md:h-32">
				<Cords />
				<span className="relative grid size-19.5 place-items-center rounded-full bg-popover shadow-md/5">
					<QuipuMark className="h-10 w-11" />
				</span>
			</div>
			{corner}
			<div className="flex flex-1 flex-col px-6 pt-6 pb-6 md:px-7.5 md:pb-7">{children}</div>
		</DialogPopup>
	);
}

export function PlusCardHeading({
	pill,
	title,
	description,
	titleRef,
	className,
}: {
	pill?: string;
	title: string;
	description: string;
	titleRef: Ref<HTMLHeadingElement>;
	className?: string;
}) {
	return (
		<>
			{pill ? (
				<span className="mb-3 inline-flex self-start rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
					{pill}
				</span>
			) : null}
			<DialogTitle
				ref={titleRef}
				tabIndex={-1}
				className={cn(
					"font-sans text-[31px] leading-tight font-semibold tracking-tight wrap-anywhere outline-none md:text-[34px]",
					className,
				)}
			>
				{title}
			</DialogTitle>
			<DialogDescription className="mt-3 max-w-89 text-[13px] leading-relaxed">
				{description}
			</DialogDescription>
		</>
	);
}

export function PlusRows({ rows, className }: { rows: PlusRow[]; className?: string }) {
	return (
		<ul className={cn("mt-5.5 grid gap-4 text-[13px]", className)}>
			{rows.map(({ Icon, name, detail }) => (
				<li key={name} className="flex items-start gap-3">
					<Icon aria-hidden className="mt-px size-5 shrink-0 text-envelope-savings" />
					<span className="min-w-0">
						{name}
						<span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
					</span>
				</li>
			))}
		</ul>
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
