import { formatCents, splitIncome } from "@quipu/backend/shared/budget";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { cn } from "cn";
import { ArrowLeft } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Field, FieldError } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { type SplitStepValues, splitStepSchema } from "#/modules/onboarding/schemas";

const ENVELOPES = [
	{ key: "needs", label: "Necesidades", dot: "bg-sky-800" },
	{ key: "wants", label: "Gustos", dot: "bg-orange-600" },
	{ key: "savings", label: "Ahorro", dot: "bg-teal-700" },
] as const;

type Props = {
	defaultValues: SplitStepValues;
	incomeCents: number;
	/** Back keeps what was typed, even if it doesn't add up to 100 yet. */
	onBack: (value: SplitStepValues) => void;
	onNext: (value: SplitStepValues) => void;
};

export function SplitStep({ defaultValues, incomeCents, onBack, onNext }: Props) {
	const form = useForm({
		defaultValues,
		validationLogic: revalidateLogic(),
		validators: { onDynamic: splitStepSchema },
		onSubmit: ({ value }) => onNext(value),
	});

	return (
		<>
			<Button
				type="button"
				variant="ghost"
				className="mt-6 h-8 gap-2 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
				onClick={() => onBack(form.state.values)}
			>
				<ArrowLeft strokeWidth={1.5} />
				Volver
			</Button>
			<h1 className="mt-9 text-4xl font-normal leading-tight tracking-tight sm:text-5xl">
				Así se reparte
			</h1>
			<form
				noValidate
				className="mt-8"
				onSubmit={(e) => {
					e.preventDefault();
					void form.handleSubmit();
				}}
			>
				<form.Field name="split">
					{(splitField) => {
						const isInvalid = !splitField.state.meta.isValid;
						const errorMessage = splitField.state.meta.errors[0]?.message;
						const shares = splitIncome(incomeCents, splitField.state.value);
						return (
							<>
								<div className="border-t border-border">
									{ENVELOPES.map((envelope) => (
										<form.Field key={envelope.key} name={`split.${envelope.key}`}>
											{(field) => (
												<Field
													name={field.name}
													invalid={isInvalid}
													className="border-b border-border py-5"
												>
													<div className="flex w-full items-center gap-3">
														<span
															aria-hidden="true"
															className={cn("size-2 shrink-0 rounded-full", envelope.dot)}
														/>
														<span className="flex-1 text-base">{envelope.label}</span>
														<Input
															name={field.name}
															type="number"
															inputMode="decimal"
															min={0}
															max={100}
															aria-label={`Porcentaje de ${envelope.label}`}
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(e) =>
																field.handleChange(
																	e.target.value === "" ? 0 : Number(e.target.value),
																)
															}
															unstyled
															className="w-14 border-0 border-b border-neutral-400 bg-transparent has-focus-visible:border-foreground has-aria-invalid:border-amber-500 [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-1 [&_[data-slot=input]]:text-right [&_[data-slot=input]]:tabular-nums"
														/>
														<span className="text-sm text-muted-foreground">%</span>
														<span className="w-28 text-right text-sm tabular-nums text-muted-foreground">
															S/ {formatCents(shares[envelope.key])}
														</span>
													</div>
													<div className="mt-4 h-1 w-full rounded-full bg-muted">
														<div
															className={cn("h-1 rounded-full", envelope.dot)}
															style={{
																width: `${Math.min(100, Math.max(0, field.state.value))}%`,
															}}
														/>
													</div>
												</Field>
											)}
										</form.Field>
									))}
								</div>
								{isInvalid && errorMessage ? (
									<Field name={splitField.name} invalid>
										<FieldError match className="mt-3 text-xs text-warning-foreground">
											{errorMessage}
										</FieldError>
									</Field>
								) : null}
							</>
						);
					}}
				</form.Field>
				<p className="mt-5 text-xs text-muted-foreground">
					Puedes cambiarlo cuando quieras en tus sobres.
				</p>
				<Button type="submit" variant="default" size="xl" className="mt-10 rounded-full px-8">
					Continuar
				</Button>
			</form>
		</>
	);
}
