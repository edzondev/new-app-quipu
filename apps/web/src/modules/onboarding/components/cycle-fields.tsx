import type { Cadence } from "@quipu/backend/shared/plan";
import { type Frequency, getStartDayOptions } from "@quipu/backend/shared/start-day";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Radio, RadioGroup } from "#/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { CADENCE_OPTIONS, FREQUENCY_OPTIONS } from "#/modules/onboarding/cycle-options";

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
					className="min-h-11 rounded-full px-3 text-xs before:rounded-full hover:bg-transparent data-pressed:bg-foreground data-pressed:text-background data-pressed:hover:bg-foreground sm:px-4 sm:text-xs"
				>
					{option.label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}

/** One choice among the frequencies, with none picked until the person picks. */
export function FrequencyRadios({
	value,
	onChange,
}: {
	value: Frequency | "";
	onChange: (frequency: Frequency) => void;
}) {
	return (
		<RadioGroup
			aria-label="Cada cuánto te pagan"
			value={value}
			onValueChange={(next) => {
				const option = FREQUENCY_OPTIONS.find((item) => item.value === next);
				if (option) onChange(option.value);
			}}
			className="mt-6.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4"
		>
			{FREQUENCY_OPTIONS.map((option) => (
				<label
					key={option.value}
					className="flex min-h-14 cursor-pointer items-center gap-2.5 rounded-2xl border border-input px-3 text-sm font-semibold leading-tight has-focus-visible:ring-2 has-focus-visible:ring-ring has-data-checked:border-2 has-data-checked:border-foreground has-data-checked:bg-muted has-data-checked:px-[11px]"
				>
					<Radio value={option.value} />
					{option.label}
				</label>
			))}
		</RadioGroup>
	);
}

export function StartDaySelect({
	cadence,
	name,
	value,
	onChange,
	onBlur,
	label,
	help,
}: {
	cadence: Cadence;
	name: string;
	value: string;
	onChange: (startDay: string) => void;
	onBlur?: () => void;
	label: string;
	help?: string;
}) {
	return (
		<>
			<Label className="mt-5.5 flex flex-col items-start gap-2 text-sm font-normal text-muted-foreground sm:text-sm">
				{label}
				<select
					name={name}
					value={value}
					onBlur={onBlur}
					onChange={(e) => onChange(e.target.value)}
					className="rounded-full bg-muted px-4 py-2 min-h-11 text-base sm:text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{getStartDayOptions(cadence, value).map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</Label>
			{help ? <p className="mt-2 text-xs text-muted-foreground">{help}</p> : null}
		</>
	);
}

const MONEY_SIZES = {
	lg: {
		prefix: "text-2xl",
		input: "[&_[data-slot=input]]:text-5xl sm:[&_[data-slot=input]]:text-6xl",
	},
	md: {
		prefix: "text-xl",
		input: "[&_[data-slot=input]]:text-3xl sm:[&_[data-slot=input]]:text-4xl",
	},
};

// What MoneyField reads from a form.Field, typed to a text field instead of AnyFieldApi.
type MoneyFieldApi = {
	name: string;
	handleBlur: () => void;
	handleChange: (value: string) => void;
	state: {
		value: string;
		meta: {
			isTouched: boolean;
			isValid: boolean;
			errors: ReadonlyArray<{ message: string } | undefined>;
		};
	};
};

export function MoneyField({
	field,
	label,
	ariaLabel,
	size,
	className,
}: {
	field: MoneyFieldApi;
	label: string;
	ariaLabel: string;
	size: keyof typeof MONEY_SIZES;
	className: string;
}) {
	const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
	const message = field.state.meta.errors[0]?.message;
	return (
		<Field name={field.name} invalid={invalid} className={className}>
			<FieldLabel className="text-sm font-normal text-muted-foreground">{label}</FieldLabel>
			<div className="mt-3 flex w-full items-baseline gap-3 border-b border-input pb-3 has-focus-visible:border-foreground has-aria-invalid:border-warning">
				<span className={`${MONEY_SIZES[size].prefix} text-muted-foreground`}>S/</span>
				<Input
					name={field.name}
					inputMode="decimal"
					autoComplete="off"
					aria-label={ariaLabel}
					placeholder="0.00"
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(e) => field.handleChange(e.target.value)}
					unstyled
					className={`w-full border-0 bg-transparent [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:leading-tight [&_[data-slot=input]]:tabular-nums ${MONEY_SIZES[size].input}`}
				/>
			</div>
			{invalid && message ? (
				<FieldError match className="mt-2 text-xs text-warning-foreground">
					{message}
				</FieldError>
			) : null}
		</Field>
	);
}
