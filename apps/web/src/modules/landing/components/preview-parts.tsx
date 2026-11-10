import { Link } from "@tanstack/react-router";
import { ArrowUpRightIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { QuipuMark } from "#/components/quipu-mark";
import type { Envelope } from "../landing-data";

export const wrap =
	"mx-auto w-[min(1120px,calc(100%-40px))] sm:w-[min(1120px,calc(100%-64px))] xl:w-[min(1120px,calc(100%-96px))]";

type SignUpButtonProps = Omit<React.ComponentProps<typeof Button>, "render"> & { arrow?: boolean };

/** Every call to action on the landing goes to the sign-in form. */
export function SignUpButton({ children, arrow = true, ...props }: SignUpButtonProps) {
	return (
		<Button render={<Link to="/sign-in" />} {...props}>
			{children}
			{arrow ? <ArrowUpRightIcon aria-hidden="true" /> : null}
		</Button>
	);
}

export function Brand() {
	return (
		<span className="inline-flex min-h-11 items-center gap-2.5 font-heading text-[28px] font-medium tracking-tight text-foreground">
			<QuipuMark className="h-[27px] w-[30px]" />
			Quipu
		</span>
	);
}

export function Eyebrow({ index, children }: { index?: string; children: React.ReactNode }) {
	return (
		<p className="flex items-center gap-2.5 text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">
			{index ? <span className="font-mono font-normal text-primary">{index}</span> : null}
			{children}
		</p>
	);
}

export function Label({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
			{children}
		</p>
	);
}

/** A sample amount: the integer part big, the cents small. `className` sets the size. */
export function Money({ int, dec, className }: { int: string; dec: string; className?: string }) {
	return (
		<p
			className={`my-2 flex items-start gap-1 font-mono leading-tight tracking-tighter whitespace-nowrap text-foreground ${className ?? "text-7xl"}`}
		>
			<span className="mt-[0.14em] text-[0.3em] tracking-normal text-muted-foreground">S/</span>
			<span>{int}</span>
			<span className="mt-[0.12em] text-[0.4em] text-muted-foreground">{dec}</span>
		</p>
	);
}

export function Dot({ color }: { color: string }) {
	return (
		<i
			aria-hidden="true"
			className="inline-block size-[7px] flex-none rounded-full"
			style={{ background: color }}
		/>
	);
}

export function EnvelopeRow({ envelope }: { envelope: Envelope }) {
	return (
		<div className="border-b border-border py-2.5 last:border-b-0">
			<div className="flex items-center justify-between gap-2.5 text-xs">
				<span className="flex items-center gap-2">
					<Dot color={envelope.color} />
					{envelope.name}
				</span>
				<span className="font-mono text-xs whitespace-nowrap">
					{envelope.amount}{" "}
					<small className="font-sans text-xs text-muted-foreground max-sm:hidden">
						{envelope.total}
					</small>
				</span>
			</div>
			<div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
				<i
					className="block h-full rounded-full"
					style={{ width: `${envelope.percent}%`, background: envelope.color }}
				/>
			</div>
		</div>
	);
}

type MiniRowProps = {
	color: string;
	name: string;
	detail: string;
	amount: string;
	action?: string;
};

export function MiniRow({ color, name, detail, amount, action }: MiniRowProps) {
	return (
		<div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
			<div className="flex min-w-0 items-center gap-2.5 text-xs">
				<Dot color={color} />
				<div className="min-w-0">
					{name}
					<small className="block truncate text-xs text-muted-foreground">{detail}</small>
				</div>
			</div>
			<div className="shrink-0 font-mono text-xs whitespace-nowrap">
				{action ? (
					<span className="mr-2.5 rounded-full border border-input px-2 py-1 font-sans text-xs font-medium">
						{action}
					</span>
				) : null}
				{amount}
			</div>
		</div>
	);
}
