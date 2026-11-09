import { Button } from "#/components/ui/button";
import {
	FormSheet,
	FormSheetClose,
	FormSheetDescription,
	FormSheetFooter,
	FormSheetHeader,
	FormSheetPopup,
	FormSheetTitle,
} from "#/components/form-sheet";

export function PlusSheet({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<FormSheet open={open} onOpenChange={onOpenChange}>
			<FormSheetPopup>
				<FormSheetHeader>
					<FormSheetTitle>Precio por confirmar</FormSheetTitle>
					<FormSheetDescription>Pronto podrás suscribirte desde aquí.</FormSheetDescription>
				</FormSheetHeader>
				<FormSheetFooter variant="bare">
					<FormSheetClose render={<Button size="xl" className="rounded-full" />}>
						Entendido
					</FormSheetClose>
				</FormSheetFooter>
			</FormSheetPopup>
		</FormSheet>
	);
}
