import { type ReactNode, useState } from "react";
import { FormSheet, FormSheetPopup } from "#/components/form-sheet";
import { ACTION } from "#/lib/typography";
import { useHouseholdGate } from "#/modules/household/use-read-only-gate";

/**
 * A small action button that opens a dialog. The content mounts only while open, so each form
 * starts from the latest data every time. `gated`: it edits the household, so it opens Plus when the
 * household is read-only.
 */
export function ActionDialog({
	label,
	gated = false,
	defaultOpen = false,
	className = ACTION,
	children,
}: {
	label: string;
	gated?: boolean;
	defaultOpen?: boolean;
	className?: string;
	children: (close: () => void) => ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen);
	const gate = useHouseholdGate(gated);
	return (
		<>
			<button
				type="button"
				aria-haspopup="dialog"
				className={className}
				onClick={() => setOpen(true)}
				{...gate}
			>
				{label}
			</button>
			<FormSheet open={open} onOpenChange={setOpen}>
				<FormSheetPopup>{children(() => setOpen(false))}</FormSheetPopup>
			</FormSheet>
		</>
	);
}
