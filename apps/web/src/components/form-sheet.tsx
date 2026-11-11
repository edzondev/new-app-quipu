import { cn } from "cn";
import { type ComponentProps, createContext, type ReactNode, useContext, useState } from "react";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerPanel,
	DrawerPopup,
	DrawerTitle,
} from "#/components/ui/drawer";

// Tailwind's `max-md`, in rem so it moves with the CSS when the browser font size changes.
const MOBILE_QUERY = "(width < 48rem)";

type Shell = "drawer" | "dialog";

const MobileContext = createContext(false);

/**
 * A bottom Drawer below `md` and a Dialog from `md` up. Both roots stay mounted while closed, so
 * opening and closing play the library's own animations. The shell is chosen when it opens and kept
 * until the exit animation ends: a resize never swaps it or loses what was typed.
 */
export function FormSheet({
	open,
	onOpenChange,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: ReactNode;
}) {
	const [shell, setShell] = useState<Shell | null>(null);
	// Callers clear their data when they close; the exit animation shows what was open instead.
	const [held, setHeld] = useState<ReactNode>(null);
	if (open && !shell) setShell(window.matchMedia(MOBILE_QUERY).matches ? "drawer" : "dialog");
	if (open && held !== children) setHeld(children);
	const content = open ? children : held;

	// The content mounts only in the chosen shell, from opening until its exit animation completes.
	const done = (mine: Shell) => (isOpen: boolean) => {
		if (isOpen || shell !== mine) return;
		setShell(null);
		setHeld(null);
	};

	return (
		<MobileContext value={shell === "drawer"}>
			<Drawer
				open={open && shell === "drawer"}
				onOpenChange={onOpenChange}
				onOpenChangeComplete={done("drawer")}
			>
				{shell === "drawer" ? content : null}
			</Drawer>
			<Dialog
				open={open && shell === "dialog"}
				onOpenChange={onOpenChange}
				onOpenChangeComplete={done("dialog")}
			>
				{shell === "dialog" ? content : null}
			</Dialog>
		</MobileContext>
	);
}

/** A FormSheet for one form: it mounts while open, so each opening starts from its defaults. */
export function FormSheetFor({
	open,
	onClose,
	children,
}: {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
}) {
	return (
		<FormSheet
			open={open}
			onOpenChange={(next) => {
				if (!next) onClose();
			}}
		>
			{open ? children : null}
		</FormSheet>
	);
}

export function FormSheetPopup(props: {
	className?: string;
	children: ReactNode;
	finalFocus?: ComponentProps<typeof DialogPopup>["finalFocus"];
}) {
	return useContext(MobileContext) ? (
		<DrawerPopup showBar showCloseButton {...props} />
	) : (
		<DialogPopup {...props} />
	);
}

// The close button sits over the header's right edge: `pe-12` keeps a long title from running under it.
export function FormSheetHeader({ className, ...props }: ComponentProps<typeof DialogHeader>) {
	const padded = cn("pe-12", className);
	return useContext(MobileContext) ? (
		<DrawerHeader className={padded} {...props} />
	) : (
		<DialogHeader className={padded} {...props} />
	);
}

export function FormSheetTitle(props: ComponentProps<typeof DialogTitle>) {
	return useContext(MobileContext) ? <DrawerTitle {...props} /> : <DialogTitle {...props} />;
}

export function FormSheetDescription(props: ComponentProps<typeof DialogDescription>) {
	return useContext(MobileContext) ? (
		<DrawerDescription {...props} />
	) : (
		<DialogDescription {...props} />
	);
}

export function FormSheetPanel(props: ComponentProps<typeof DialogPanel>) {
	return useContext(MobileContext) ? <DrawerPanel {...props} /> : <DialogPanel {...props} />;
}

export function FormSheetFooter(props: ComponentProps<typeof DialogFooter>) {
	return useContext(MobileContext) ? <DrawerFooter {...props} /> : <DialogFooter {...props} />;
}

export function FormSheetClose(props: ComponentProps<typeof DialogClose>) {
	return useContext(MobileContext) ? <DrawerClose {...props} /> : <DialogClose {...props} />;
}
