import { type ReactNode, useState } from "react";
import { FormSheet, FormSheetPopup } from "#/components/form-sheet";
import { ACTION } from "#/lib/typography";

/**
 * A small action button that opens a dialog. The content mounts only while open, so each form
 * starts from the latest data every time.
 */
export function ActionDialog({
	label,
	children,
}: {
	label: string;
	children: (close: () => void) => ReactNode;
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button type="button" aria-haspopup="dialog" className={ACTION} onClick={() => setOpen(true)}>
				{label}
			</button>
			<FormSheet open={open} onOpenChange={setOpen}>
				<FormSheetPopup>{children(() => setOpen(false))}</FormSheetPopup>
			</FormSheet>
		</>
	);
}
