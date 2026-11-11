import { cn } from "cn";
import { Input } from "#/components/ui/input";

export function AmountField({
	label,
	value,
	onChange,
	error,
	large,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	error?: string;
	large?: boolean;
}) {
	return (
		<div>
			<div
				className={cn(
					"flex items-baseline gap-3 pb-2",
					large ? "border-b-[1.5px]" : "border-b",
					error ? "border-warning" : "border-input has-focus-visible:border-foreground",
				)}
			>
				<span className={cn("text-muted-foreground", large ? "text-[22px]" : "text-lg")}>S/</span>
				<Input
					inputMode="decimal"
					autoComplete="off"
					aria-label={label}
					aria-invalid={error ? true : undefined}
					placeholder="0.00"
					value={value}
					onChange={(event) => onChange(event.target.value)}
					unstyled
					className={cn(
						"w-full border-0 bg-transparent [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:tabular-nums",
						large
							? "[&_[data-slot=input]]:text-[44px] [&_[data-slot=input]]:leading-tight"
							: "[&_[data-slot=input]]:text-2xl",
					)}
				/>
			</div>
			{error ? (
				<p role="alert" className="wrap-break-word mt-1.5 text-xs text-warning-foreground">
					{error}
				</p>
			) : null}
		</div>
	);
}
