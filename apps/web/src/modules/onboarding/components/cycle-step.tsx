import { formatRange, getFirstCycleRange } from "@quipu/backend/shared/dates";
import { parseStartDay } from "@quipu/backend/shared/plan";
import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { Button } from "#/components/ui/button";
import {
	CadenceToggle,
	MoneyField,
	StartDaySelect,
} from "#/modules/onboarding/components/cycle-fields";
import { StepHeader } from "#/modules/onboarding/components/step-header";
import { type CycleStepValues, cycleStepSchema } from "#/modules/onboarding/schemas";

type Props = {
	defaultValues: CycleStepValues;
	today: string;
	onBack: (value: CycleStepValues) => void;
	onNext: (value: CycleStepValues) => void;
};

export function CycleStep({ defaultValues, today, onBack, onNext }: Props) {
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
			<StepHeader title="¿Cada cuánto quieres planear?" onBack={() => onBack(form.state.values)} />
			<form
				noValidate
				className="mt-8"
				onSubmit={(e) => {
					e.preventDefault();
					void form.handleSubmit();
				}}
			>
				<form.Field name="todayAmount">
					{(field) => (
						<MoneyField
							field={field}
							label="¿Cuánto tienes hoy?"
							ariaLabel="Cuánto tienes hoy"
							size="lg"
							className="mt-12"
						/>
					)}
				</form.Field>

				<div className="mt-6">
					<form.Field
						name="cadence"
						listeners={{ onChange: () => form.setFieldValue("startDay", "1") }}
					>
						{(field) => <CadenceToggle value={field.state.value} onChange={field.handleChange} />}
					</form.Field>
				</div>

				<form.Field name="startDay">
					{(field) => (
						<StartDaySelect
							cadence={cadence}
							name={field.name}
							value={field.state.value}
							onChange={field.handleChange}
							onBlur={field.handleBlur}
							label="¿Qué día te pagan?"
							className="flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
						/>
					)}
				</form.Field>
				<p className="mt-3 text-xs text-muted-foreground">
					Tu ciclo: {formatRange(cycle.startDate, cycle.endDate)}
				</p>

				<form.Field name="cycleIncome">
					{(field) => (
						<MoneyField
							field={field}
							label="¿Cuánto te pagan normalmente? · opcional"
							ariaLabel="Cuánto te pagan normalmente"
							size="md"
							className="mt-10"
						/>
					)}
				</form.Field>

				<Button type="submit" variant="default" size="xl" className="mt-10 rounded-full px-8">
					Continuar
				</Button>
			</form>
		</>
	);
}
