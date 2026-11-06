import { type ReactNode, useState } from "react";
import { Dialog, DialogPopup, DialogTrigger } from "#/components/ui/dialog";
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
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<button type="button" className={ACTION} />}>{label}</DialogTrigger>
			<DialogPopup>{children(() => setOpen(false))}</DialogPopup>
		</Dialog>
	);
}
