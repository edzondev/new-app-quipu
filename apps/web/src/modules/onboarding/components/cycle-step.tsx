import { formatRange, getFirstCycleRange } from "@quipu/backend/shared/dates";
import { parseStartDay } from "@quipu/backend/shared/plan";
import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { Button } from "#/components/ui/button";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { CadenceToggle, StartDaySelect } from "#/modules/onboarding/components/cycle-fields";
import { StepHeader } from "#/modules/onboarding/components/step-header";
import { type CycleStepValues, cycleStepSchema } from "#/modules/onboarding/schemas";

type Props = {
	defaultValues: CycleStepValues;
	today: string;
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
	const cycle = getFirstCycleRange(cadence, parseStartDay(startDay), today);

	return (
		<>
			<StepHeader title="¿Cada cuánto quieres planear?" />
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
					{(field) => <CadenceToggle value={field.state.value} onChange={field.handleChange} />}
				</form.Field>

				<form.Field name="startDay">
					{(field) => (
						<StartDaySelect
							cadence={cadence}
							name={field.name}
							value={field.state.value}
							onChange={field.handleChange}
							onBlur={field.handleBlur}
						/>
					)}
				</form.Field>
				<p className="mt-3 text-xs text-muted-foreground">
					Tu ciclo: {formatRange(cycle.startDate, cycle.endDate)}
				</p>

				<form.Field name="todayAmount">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						const errorMessage = field.state.meta.errors[0]?.message;
						return (
							<Field name={field.name} invalid={isInvalid} className="mt-12">
								<FieldLabel className="text-sm font-normal text-muted-foreground">
									¿Cuánto tienes hoy?
								</FieldLabel>
								<div className="mt-3 flex w-full items-baseline gap-3 border-b border-input pb-3 has-focus-visible:border-foreground has-aria-invalid:border-warning">
									<span className="text-2xl text-muted-foreground">S/</span>
									<Input
										name={field.name}
										inputMode="decimal"
										autoComplete="off"
										aria-label="Cuánto tienes hoy"
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

				<form.Field name="cycleIncome">
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
						const errorMessage = field.state.meta.errors[0]?.message;
						return (
							<Field name={field.name} invalid={isInvalid} className="mt-10">
								<FieldLabel className="text-sm font-normal text-muted-foreground">
									¿Cuánto ganas por ciclo?
								</FieldLabel>
								<div className="mt-3 flex w-full items-baseline gap-3 border-b border-input pb-3 has-focus-visible:border-foreground has-aria-invalid:border-warning">
									<span className="text-xl text-muted-foreground">S/</span>
									<Input
										name={field.name}
										inputMode="decimal"
										autoComplete="off"
										aria-label="Cuánto ganas por ciclo"
										placeholder="0.00"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										unstyled
										className="w-full border-0 bg-transparent [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:text-3xl [&_[data-slot=input]]:leading-tight [&_[data-slot=input]]:tabular-nums sm:[&_[data-slot=input]]:text-4xl"
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
