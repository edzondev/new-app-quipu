import type { Cadence } from "@quipu/backend/shared/plan";
import { Label } from "#/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { CADENCE_OPTIONS, getStartDayOptions } from "#/modules/onboarding/cycle-options";

export function CadenceToggle({
	value,
	onChange,
}: {
	value: Cadence;
	onChange: (cadence: Cadence) => void;
}) {
	return (
		<ToggleGroup
			aria-label="Cada cuánto planear"
			value={[value]}
			onValueChange={(next) => {
				const option = CADENCE_OPTIONS.find((item) => item.value === next[0]);
				if (option) onChange(option.value);
			}}
			className="rounded-full bg-muted p-1"
		>
			{CADENCE_OPTIONS.map((option) => (
				<ToggleGroupItem
					key={option.value}
					value={option.value}
					className="h-8 rounded-full px-3 text-xs before:rounded-full hover:bg-transparent data-pressed:bg-foreground data-pressed:text-background data-pressed:hover:bg-foreground sm:h-8 sm:px-4 sm:text-xs"
				>
					{option.label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}

export function StartDaySelect({
	cadence,
	name,
	value,
	onChange,
	onBlur,
}: {
	cadence: Cadence;
	name: string;
	value: string;
	onChange: (startDay: string) => void;
	onBlur?: () => void;
}) {
	return (
		<Label className="mt-6 flex items-center gap-3 text-sm sm:text-sm font-normal text-muted-foreground">
			Empieza el
			<select
				name={name}
				value={value}
				onBlur={onBlur}
				onChange={(e) => onChange(e.target.value)}
				className="rounded-full bg-muted px-4 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{getStartDayOptions(cadence).map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</Label>
	);
}
