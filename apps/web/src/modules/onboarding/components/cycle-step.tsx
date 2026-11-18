import {
	DEFAULT_START_DAY,
	describePayday,
	getCyclePlan,
	getStartDayHelp,
	getStartDayTitle,
	isFrequency,
} from "@quipu/backend/shared/start-day";
import { useSelector } from "@tanstack/react-form";
import { Button } from "#/components/ui/button";
import { withForm } from "#/hooks/use-app-form";
import {
	FrequencyRadios,
	MoneyField,
	StartDaySelect,
} from "#/modules/onboarding/components/cycle-fields";
import { StepHeader } from "#/modules/onboarding/components/step-header";
import { emptyValues } from "#/modules/onboarding/default-values";

export const CycleStep = withForm({
	defaultValues: emptyValues,
	props: { today: "", onBack: () => {}, onSubmit: () => {} },
	render: function Render({ form, today, onBack, onSubmit }) {
		const frequency = useSelector(form.store, (state) => state.values.cycleStep.frequency);
		const startDay = useSelector(form.store, (state) => state.values.cycleStep.startDay);
		const plan = isFrequency(frequency) ? getCyclePlan(frequency, startDay, today) : null;

		return (
			<>
				<StepHeader title="¿Cada cuánto te pagan?" onBack={onBack} />
				<form
					noValidate
					className="mt-8"
					onSubmit={(e) => {
						e.preventDefault();
						onSubmit();
					}}
				>
					<form.Field name="cycleStep.frequency">
						{(field) => (
							<FrequencyRadios
								value={field.state.value}
								onChange={(next) => {
									field.handleChange(next);
									form.setFieldValue("cycleStep.startDay", DEFAULT_START_DAY[next]);
									// The income field is hidden without a fixed pay: nothing typed there may block the step.
									if (next === "variable") form.setFieldValue("cycleStep.cycleIncome", "");
								}}
							/>
						)}
					</form.Field>

					{plan && plan.frequency !== "variable" ? (
						<form.Field name="cycleStep.startDay">
							{(field) => (
								<StartDaySelect
									cadence={plan.cadence}
									name={field.name}
									value={field.state.value}
									onChange={field.handleChange}
									onBlur={field.handleBlur}
									label={getStartDayTitle(plan.cadence)}
									help={getStartDayHelp(plan.cadence)}
								/>
							)}
						</form.Field>
					) : null}

					{/* The region stays mounted so a screen reader announces what appears in it. */}
					<div
						role="status"
						aria-live="polite"
						className={plan ? "mt-3.5 max-w-110 rounded-2xl bg-muted px-4.5 py-3.5" : undefined}
					>
						{plan ? (
							<>
								<p className="text-[15px] font-semibold">
									{describePayday(plan.frequency, plan.cycleStartDay)}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Tu primer ciclo{" "}
									<span className="ml-1 text-sm tabular-nums text-foreground">
										{plan.firstCycle}
									</span>
								</p>
								{plan.frequency === "variable" ? (
									<p className="mt-1 text-xs text-muted-foreground">Lo cambias en Ajustes.</p>
								) : null}
							</>
						) : null}
					</div>

					{plan && plan.frequency !== "variable" ? (
						<>
							<form.Field name="cycleStep.cycleIncome">
								{(field) => (
									<MoneyField
										field={field}
										label="¿Cuánto te pagan? · opcional"
										ariaLabel="Cuánto te pagan"
										size="md"
										className="mt-5.5 max-w-110"
									/>
								)}
							</form.Field>
							<p className="mt-1.5 text-xs text-muted-foreground">Si varía, déjalo vacío.</p>
						</>
					) : null}

					<Button
						type="submit"
						variant="default"
						size="xl"
						disabled={plan === null}
						className="mt-7.5 rounded-full px-8"
					>
						Continuar
					</Button>
				</form>
			</>
		);
	},
});
