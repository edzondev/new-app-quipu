import { useConvexMutation } from "@convex-dev/react-query";
import { es } from "@daypicker/react/locale";
import { api } from "@quipu/backend/convex/_generated/api";
import { dueDateFor, type DueRule } from "@quipu/backend/shared/commitments";
import {
	formatLocalDate,
	monthName,
	parseLocalDate,
	shiftMonth,
} from "@quipu/backend/shared/dates";
import { useMutation } from "@tanstack/react-query";
import { MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";
import {
	FormSheet,
	FormSheetDescription,
	FormSheetHeader,
	FormSheetPanel,
	FormSheetPopup,
	FormSheetTitle,
} from "#/components/form-sheet";
import {
	AlertDialog,
	AlertDialogClose,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogPopup,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "#/components/ui/menu";
import { readError } from "#/lib/read-error";
import { readOnlyProps, useIsReadOnly } from "#/modules/household/use-read-only-gate";
import { type CommitmentItem, ruleDay } from "../commitment-view";
import { FieldError } from "./field-error";

type Space = "personal" | "household";
type Props = {
	item: CommitmentItem;
	space: Space;
	onEdit: () => void;
	/** Tells the page what happened, for its toast. */
	onNotice: (message: string) => void;
};

const TRIGGER_CLASS = "size-11 shrink-0 rounded-full";

/** "Solo cambia noviembre. En diciembre vuelve al 28." with the month and the rule of the item. */
function dueMonthText(item: CommitmentItem, rule: DueRule) {
	const month = item.dueDate.slice(0, 7);
	const following = shiftMonth(month, 1);
	const backTo = Number(dueDateFor(rule, undefined, following).slice(8));
	return `Solo cambia ${monthName(month)}. En ${monthName(following)} vuelve al ${backTo}.`;
}

/** The calendar stays in the month of the charge and lets any day be chosen, also a past one. */
function DueMonthDialog({
	item,
	rule,
	space,
	today,
	onClose,
	onNotice,
}: Props & {
	rule: DueRule;
	today: string;
	onClose: () => void;
}) {
	const setDue = useConvexMutation(api.commitments.setDueThisMonth);
	const save = useMutation({
		mutationFn: (day: number) =>
			setDue({ space, id: item.id, month: item.dueDate.slice(0, 7), day }),
		onSuccess: (_, day) => {
			onNotice(`${item.name} vence el ${day} este mes`);
			onClose();
		},
	});
	const month = parseLocalDate(item.dueDate);

	return (
		<FormSheetPopup>
			<FormSheetHeader>
				<FormSheetTitle>Este mes vence…</FormSheetTitle>
				<FormSheetDescription>{dueMonthText(item, rule)}</FormSheetDescription>
			</FormSheetHeader>
			<FormSheetPanel className="flex flex-col items-center">
				<Calendar
					mode="single"
					locale={es}
					month={month}
					hideNavigation
					showOutsideDays={false}
					today={parseLocalDate(today)}
					selected={month}
					onSelect={(date) => {
						if (date && formatLocalDate(date).slice(0, 7) === item.dueDate.slice(0, 7)) {
							save.mutate(date.getDate());
						}
					}}
				/>
				{save.isError ? <FieldError>{readError(save.error)}</FieldError> : null}
			</FormSheetPanel>
		</FormSheetPopup>
	);
}

function RemoveDialog({
	item,
	space,
	open,
	onOpenChange,
}: {
	item: CommitmentItem;
	space: Space;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const remove = useConvexMutation(api.commitments.remove);
	const erase = useMutation({
		mutationFn: () => remove({ space, id: item.id }),
		onSuccess: () => onOpenChange(false),
	});

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogPopup>
				<AlertDialogHeader>
					<AlertDialogTitle>¿Borrar el compromiso?</AlertDialogTitle>
					<AlertDialogDescription>
						«{item.name}» deja de reservar dinero. Los pagos que ya hiciste se quedan en
						Movimientos.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{erase.isError ? (
					<p role="alert" className="px-6 pb-4 text-xs text-warning-foreground">
						{readError(erase.error)}
					</p>
				) : null}
				<AlertDialogFooter>
					<Button variant="outline" loading={erase.isPending} onClick={() => erase.mutate()}>
						Borrar compromiso
					</Button>
					<AlertDialogClose render={<Button />}>Mantener compromiso</AlertDialogClose>
				</AlertDialogFooter>
			</AlertDialogPopup>
		</AlertDialog>
	);
}

/** The "⋯" of a row. In a household without Plus it is off, like "+ Registrar". */
export function CommitmentMenu(props: Props & { today: string }) {
	const { item, space, onEdit } = props;
	const readOnly = useIsReadOnly();
	const [panel, setPanel] = useState<"due" | "remove" | null>(null);
	const label = `Más opciones de ${item.name}`;

	if (readOnly) {
		return (
			<Button
				variant="ghost"
				size="icon"
				aria-label={label}
				className={TRIGGER_CLASS}
				{...readOnlyProps}
			>
				<MoreHorizontalIcon aria-hidden />
			</Button>
		);
	}

	return (
		<>
			<Menu>
				<MenuTrigger
					render={
						<Button variant="ghost" size="icon" aria-label={label} className={TRIGGER_CLASS} />
					}
				>
					<MoreHorizontalIcon aria-hidden />
				</MenuTrigger>
				<MenuPopup align="end">
					{item.rule ? <MenuItem onClick={() => setPanel("due")}>Este mes vence…</MenuItem> : null}
					{item.status === "paid" ? null : <MenuItem onClick={onEdit}>Editar</MenuItem>}
					<MenuItem onClick={() => setPanel("remove")}>Borrar</MenuItem>
				</MenuPopup>
			</Menu>
			{item.rule ? (
				<FormSheet open={panel === "due"} onOpenChange={(open) => setPanel(open ? "due" : null)}>
					{panel === "due" ? (
						<DueMonthDialog {...props} rule={item.rule} onClose={() => setPanel(null)} />
					) : null}
				</FormSheet>
			) : null}
			<RemoveDialog
				item={item}
				space={space}
				open={panel === "remove"}
				onOpenChange={(open) => setPanel(open ? "remove" : null)}
			/>
		</>
	);
}

/** "Volver al 28": takes the one-month change back. */
export function BackToRuleButton({
	item,
	space,
	className,
}: {
	item: CommitmentItem;
	space: Space;
	className: string;
}) {
	const clear = useConvexMutation(api.commitments.clearDueThisMonth);
	const back = useMutation({ mutationFn: () => clear({ space, id: item.id }) });
	const day = ruleDay(item);
	if (day === null) return null;
	return (
		<>
			<button
				type="button"
				className={className}
				disabled={back.isPending}
				onClick={() => back.mutate()}
			>
				Volver al {day}
			</button>
			{back.isError ? <FieldError>{readError(back.error)}</FieldError> : null}
		</>
	);
}
