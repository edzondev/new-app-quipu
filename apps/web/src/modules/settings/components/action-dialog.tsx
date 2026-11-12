import { type ReactNode, useState } from "react";
import { FormSheet, FormSheetPopup } from "#/components/form-sheet";
import { ACTION } from "#/lib/typography";
import { useHouseholdGate } from "#/modules/household/use-read-only-gate";

/**
 * A small action button that opens a dialog. The content mounts only while open, so each form
 * starts from the latest data every time. `gated`: it edits the household, so it opens Plus when the
 * household is read-only. `onClose` runs when the dialog closes by any way that goes through its
 * open state (Cancelar, the backdrop, Escape).
 */
export function ActionDialog({
	label,
	gated = false,
	defaultOpen = false,
	onClose,
	className = ACTION,
	children,
}: {
	label: string;
	gated?: boolean;
	defaultOpen?: boolean;
	onClose?: () => void;
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
			<FormSheet
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					if (!next) onClose?.();
				}}
			>
				<FormSheetPopup>{children(() => setOpen(false))}</FormSheetPopup>
			</FormSheet>
		</>
	);
}
