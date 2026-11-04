import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS, toCents } from "@quipu/backend/shared/budget";
import { isIsoDate } from "@quipu/backend/shared/dates";
import { isValidMonthDay, MAX_MONTH_DAY } from "@quipu/backend/shared/plan";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { useState } from "react";
import { ChoiceChips } from "#/components/choice-chips";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { readError } from "#/lib/read-error";
import { AmountField } from "./amount-field";

type Envelope = "needs" | "wants";
type Frequency = "monthly" | "once";

const NAME_MAX = 40;

const ENVELOPES: { value: Envelope; label: string }[] = [
	{ value: "needs", label: ENVELOPE_LABELS.needs },
	{ value: "wants", label: ENVELOPE_LABELS.wants },
];

const FREQUENCIES: { value: Frequency; label: string }[] = [
	{ value: "monthly", label: "Cada mes" },
	{ value: "once", label: "Una vez" },
];

function FieldError({ children }: { children?: string }) {
	return children ? (
		<p role="alert" className="mt-1.5 text-xs text-warning-foreground">
			{children}
		</p>
	) : null;
}

function AddCommitmentForm({
	space,
	onDone,
}: {
	space: "personal" | "household";
	onDone: () => void;
}) {
	const add = useConvexMutation(api.commitments.add);
	const [name, setName] = useState("");
	const [amount, setAmount] = useState("");
	const [envelope, setEnvelope] = useState<Envelope>("needs");
	const [frequency, setFrequency] = useState<Frequency>("monthly");
	const [day, setDay] = useState("");
	const [date, setDate] = useState("");
	const [tried, setTried] = useState(false);

	const amountCents = toCents(amount);
	const dueDay = Number(day);
	const errors = {
		name: name.trim() ? undefined : "Ponle un nombre.",
		amount: amountCents > 0 ? undefined : "Escribe el monto de cada pago.",
		when:
			frequency === "monthly"
				? isValidMonthDay(dueDay)
					? undefined
					: "Elige la fecha de vencimiento."
				: isIsoDate(date)
					? undefined
					: "Elige la fecha de vencimiento.",
	};
	const invalid = Boolean(errors.name || errors.amount || errors.when);
	const shown: Partial<typeof errors> = tried ? errors : {};

	const save = useMutation({
		mutationFn: () =>
			add({
				space,
				name,
				amountCents,
				envelope,
				schedule: frequency === "monthly" ? { frequency, dueDay } : { frequency, dueDate: date },
			}),
		onSuccess: onDone,
	});

	function submit() {
		setTried(true);
		if (!invalid) save.mutate();
	}

	return (
		<DialogPopup>
			<DialogHeader>
				<DialogTitle>Añadir compromiso</DialogTitle>
				<DialogDescription>Quipu lo reserva antes de que gastes.</DialogDescription>
			</DialogHeader>
			<DialogPanel className="flex flex-col gap-5">
				<div>
					<Input
						aria-label="Nombre"
						aria-invalid={shown.name ? true : undefined}
						placeholder="ej. Luz del Sur"
						maxLength={NAME_MAX}
						value={name}
						onChange={(event) => setName(event.target.value)}
						className={cn(shown.name && "border-warning")}
					/>
					<FieldError>{shown.name}</FieldError>
				</div>

				<AmountField label="Monto" value={amount} onChange={setAmount} error={shown.amount} />

				<ChoiceChips label="Sale de" options={ENVELOPES} value={envelope} onChange={setEnvelope} />
				<ChoiceChips
					label="Frecuencia"
					options={FREQUENCIES}
					value={frequency}
					onChange={setFrequency}
				/>

				<div>
					{frequency === "monthly" ? (
						<Input
							type="number"
							inputMode="numeric"
							min={1}
							max={MAX_MONTH_DAY}
							aria-label="Vence"
							aria-invalid={shown.when ? true : undefined}
							placeholder="Vence"
							value={day}
							onChange={(event) => setDay(event.target.value)}
							className={cn(shown.when && "border-warning")}
						/>
					) : (
						<Input
							type="date"
							aria-label="Vence"
							aria-invalid={shown.when ? true : undefined}
							value={date}
							onChange={(event) => setDate(event.target.value)}
							className={cn(shown.when && "border-warning")}
						/>
					)}
					<FieldError>{shown.when}</FieldError>
				</div>

				{save.isError ? <FieldError>{readError(save.error)}</FieldError> : null}
			</DialogPanel>
			<DialogFooter>
				<Button variant="ghost" onClick={onDone}>
					Cancelar
				</Button>
				<Button loading={save.isPending} onClick={submit}>
					Guardar compromiso
				</Button>
			</DialogFooter>
		</DialogPopup>
	);
}

export function AddCommitmentDialog({
	open,
	onOpenChange,
	space,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	space: "personal" | "household";
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{open ? <AddCommitmentForm space={space} onDone={() => onOpenChange(false)} /> : null}
		</Dialog>
	);
}
