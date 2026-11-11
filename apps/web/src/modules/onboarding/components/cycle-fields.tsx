import type { Cadence } from "@quipu/backend/shared/plan";
import { cn } from "cn";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
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
					className="min-h-11 rounded-full px-3 text-xs before:rounded-full hover:bg-transparent data-pressed:bg-foreground data-pressed:text-background data-pressed:hover:bg-foreground sm:px-4 sm:text-xs"
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
	label = "Empieza el",
	className,
}: {
	cadence: Cadence;
	name: string;
	value: string;
	onChange: (startDay: string) => void;
	onBlur?: () => void;
	label?: string;
	className?: string;
}) {
	return (
		<Label
			className={cn(
				"mt-6 flex items-center gap-3 text-sm sm:text-sm font-normal text-muted-foreground",
				className,
			)}
		>
			{label}
			<select
				name={name}
				value={value}
				onBlur={onBlur}
				onChange={(e) => onChange(e.target.value)}
				className="rounded-full bg-muted px-4 py-2 min-h-11 text-base sm:text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
