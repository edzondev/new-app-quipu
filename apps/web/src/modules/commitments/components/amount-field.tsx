import { cn } from "cn";
import { Input } from "#/components/ui/input";

export function AmountField({
	label,
	value,
	onChange,
	error,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	error?: string;
}) {
	return (
		<div>
			<div
				className={cn(
					"flex items-baseline gap-3 border-b pb-2",
					error ? "border-warning" : "border-input has-focus-visible:border-foreground",
				)}
			>
				<span className="text-lg text-muted-foreground">S/</span>
				<Input
					inputMode="decimal"
					autoComplete="off"
					aria-label={label}
					aria-invalid={error ? true : undefined}
					placeholder="0.00"
					value={value}
					onChange={(event) => onChange(event.target.value)}
					unstyled
					className="w-full border-0 bg-transparent [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:text-2xl [&_[data-slot=input]]:tabular-nums"
				/>
			</div>
			{error ? (
				<p role="alert" className="mt-1.5 text-xs text-warning-foreground">
					{error}
				</p>
			) : null}
		</div>
	);
}
