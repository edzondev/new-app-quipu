import { cn } from "cn";
import { Label } from "#/components/ui/label";

export function ChoiceChips<T extends string>({
	label,
	options,
	value,
	onChange,
}: {
	label: string;
	options: { value: T; label: string }[];
	value: T;
	onChange: (value: T) => void;
}) {
	return (
		<fieldset className="flex min-w-0 flex-wrap gap-2 border-0 p-0">
			<legend className="sr-only">{label}</legend>
			{options.map((option) => (
				<Label
					key={option.value}
					className={cn(
						"inline-flex min-h-11 items-center rounded-full px-3 py-1.5 text-sm sm:text-sm font-semibold has-focus-visible:ring-2 has-focus-visible:ring-ring",
						value === option.value
							? "bg-foreground text-background"
							: "bg-muted text-muted-foreground",
					)}
				>
					<input
						type="radio"
						name={label}
						value={option.value}
						checked={value === option.value}
						onChange={() => onChange(option.value)}
						className="sr-only"
					/>
					{option.label}
				</Label>
			))}
		</fieldset>
	);
}
