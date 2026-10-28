import { MAX_MONTH_DAY } from "@quipu/backend/shared/plan";
import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { formatShortDate, getCycle } from "#/modules/onboarding/preview";
import { type Cadence, type CycleStepValues, cycleStepSchema } from "#/modules/onboarding/schemas";

const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
	{ value: "monthly", label: "Cada mes" },
	{ value: "biweekly", label: "Cada quincena" },
	{ value: "weekly", label: "Cada semana" },
];

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const CYCLE_DAYS = Array.from({ length: MAX_MONTH_DAY }, (_, index) => index + 1);

type Props = {
	defaultValues: CycleStepValues;
	today: Date;
	onNext: (value: CycleStepValues) => void;
};

export function CycleStep({ defaultValues, today, onNext }: Props) {
	const form = useForm({
		defaultValues,
		validationLogic: revalidateLogic(),
		validators: { onDynamic: cycleStepSchema },
		onSubmit: ({ value }) => onNext(value),
	});
	const cadence = useSelector(form.store, (state) => state.values.cadence);
	const startDay = useSelector(form.store, (state) => state.values.startDay);
	const cycle = getCycle(cadence, startDay, today);

	return (
		<>
			<h1 className="mt-9 text-4xl font-normal leading-tight tracking-tight sm:text-5xl">
				¿Cada cuánto quieres planear?
			</h1>
			<form
				noValidate
				className="mt-8"
				onSubmit={(e) => {
					e.preventDefault();
					void form.handleSubmit();
				}}
			>
				<form.Field
					name="cadence"
					listeners={{ onChange: () => form.setFieldValue("startDay", "1") }}
				>
					{(field) => (
						<ToggleGroup
							aria-label="Cada cuánto planear"
							value={[field.state.value]}
							onValueChange={(value) => {
								const option = CADENCE_OPTIONS.find((item) => item.value === value[0]);
								if (!option) return;
								field.handleChange(option.value);
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
					)}
				</form.Field>

				<form.Field name="startDay">
					{(field) => (
						<label className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
							Empieza el
							<select
								name={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								className="rounded-full bg-muted px-4 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{cadence === "weekly" ? (
									WEEKDAYS.map((weekday, index) => (
										<option key={weekday} value={String(index)}>
											{weekday}
										</option>
									))
								) : (
									<>
										{CYCLE_DAYS.map((day) => (
											<option key={day} value={String(day)}>
												Día {day}
											</option>
										))}
										<option value="last">Último día del mes</option>
									</>
								)}
							</select>
						</label>
					)}
				</form.Field>
				<p className="mt-3 text-xs text-muted-foreground">
					Tu ciclo: {formatShortDate(cycle.start)} – {formatShortDate(cycle.end)}
				</p>

				<form.Field name="amount">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						const errorMessage = field.state.meta.errors[0]?.message;
						return (
							<Field name={field.name} invalid={isInvalid} className="mt-12">
								<FieldLabel className="text-sm font-normal text-muted-foreground">
									¿Con cuánto cuentas para este ciclo?
								</FieldLabel>
								<div className="mt-3 flex w-full items-baseline gap-3 border-b border-neutral-400 pb-3 has-focus-visible:border-foreground has-aria-invalid:border-amber-500">
									<span className="text-2xl text-muted-foreground">S/</span>
									<Input
										name={field.name}
										inputMode="decimal"
										autoComplete="off"
										aria-label="Con cuánto cuentas para este ciclo"
										placeholder="0.00"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										unstyled
										className="w-full border-0 bg-transparent [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:text-5xl [&_[data-slot=input]]:leading-tight [&_[data-slot=input]]:tabular-nums sm:[&_[data-slot=input]]:text-6xl"
									/>
								</div>
								{isInvalid && errorMessage ? (
									<FieldError match className="mt-3 text-xs text-warning-foreground">
										{errorMessage}
									</FieldError>
								) : null}
							</Field>
						);
					}}
				</form.Field>

				<Button type="submit" variant="default" size="xl" className="mt-10 rounded-full px-8">
					Continuar
				</Button>
			</form>
		</>
	);
}
