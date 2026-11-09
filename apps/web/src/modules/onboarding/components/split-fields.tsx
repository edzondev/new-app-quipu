import { AMOUNT_KEYS, type EnvelopeAmounts, formatCents } from "@quipu/backend/shared/budget";
import type { Split } from "@quipu/backend/shared/plan";
import { cn } from "cn";
import { Field, FieldError } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { ENVELOPE_DOT } from "#/lib/envelope-dot";

const ENVELOPES = [
	{ key: "needs", label: "Necesidades", dot: ENVELOPE_DOT.needs },
	{ key: "wants", label: "Gustos", dot: ENVELOPE_DOT.wants },
	{ key: "savings", label: "Ahorro", dot: ENVELOPE_DOT.savings },
] as const;

type Props = {
	value: Split;
	/** What each envelope would hold with this split. */
	amounts: EnvelopeAmounts;
	onChange: (key: keyof Split, percent: number) => void;
	error?: string;
	/** Notes under the rows, grouped with the error. */
	children?: React.ReactNode;
};

/** The three percentage rows of Primeros pasos and of the split editor. */
export function SplitFields({ value, amounts, onChange, error, children }: Props) {
	return (
		<>
			<div className="border-t border-border">
				{ENVELOPES.map((envelope) => (
					<Field
						key={envelope.key}
						name={`split.${envelope.key}`}
						invalid={Boolean(error)}
						className="border-b border-border py-5"
					>
						<div className="flex w-full items-center gap-3">
							<span
								aria-hidden="true"
								className={cn("size-2 shrink-0 rounded-full", envelope.dot)}
							/>
							<span className="flex-1 text-base">{envelope.label}</span>
							<Input
								name={`split.${envelope.key}`}
								type="number"
								inputMode="decimal"
								min={0}
								max={100}
								aria-label={`Porcentaje de ${envelope.label}`}
								value={value[envelope.key]}
								onChange={(e) =>
									onChange(envelope.key, e.target.value === "" ? 0 : Number(e.target.value))
								}
								unstyled
								className="w-14 border-0 border-b border-input bg-transparent has-focus-visible:border-foreground has-aria-invalid:border-warning [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-1 [&_[data-slot=input]]:text-right [&_[data-slot=input]]:tabular-nums"
							/>
							<span className="text-sm text-muted-foreground">%</span>
							<span className="w-28 text-right text-sm tabular-nums text-muted-foreground">
								S/ {formatCents(amounts[AMOUNT_KEYS[envelope.key]])}
							</span>
						</div>
						<div className="mt-4 h-1 w-full rounded-full bg-muted">
							<div
								className={cn("h-1 rounded-full", envelope.dot)}
								style={{ width: `${Math.min(100, Math.max(0, value[envelope.key]))}%` }}
							/>
						</div>
					</Field>
				))}
			</div>
			{error || children ? (
				<div className="mt-4 flex flex-col gap-2">
					{error ? (
						<Field name="split" invalid>
							<FieldError match className="text-xs text-warning-foreground">
								{error}
							</FieldError>
						</Field>
					) : null}
					{children}
				</div>
			) : null}
		</>
	);
}
