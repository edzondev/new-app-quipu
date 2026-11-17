import type { Cadence } from "@quipu/backend/shared/plan";
import { Chips } from "@/components/ui/chips";
import { CADENCE_LABELS, CADENCE_ORDER } from "./days";

export function CadenceChips({
	cadence,
	onChange,
}: {
	cadence: Cadence;
	onChange: (cadence: Cadence) => void;
}) {
	return (
		<Chips
			options={CADENCE_LABELS}
			selectedIndex={CADENCE_ORDER.indexOf(cadence)}
			onChange={(index) => onChange(CADENCE_ORDER[index])}
		/>
	);
}
