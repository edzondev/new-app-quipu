import type { api } from "@quipu/backend/convex/_generated/api";
import { dueMonthText, dueMonthTitle } from "@quipu/backend/shared/commitments";
import type { FunctionReturnType } from "convex/server";
import { Pressable, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { OptionList } from "@/components/ui/option-list";
import { SheetHeader } from "@/components/ui/sheet-header";
import { monthDayOptions } from "@/features/commitments/commitment-form";
import { useCommitmentActions } from "@/features/commitments/use-commitment-actions";
import { DayRow } from "@/features/cycle/day-row";

type Space = "personal" | "household";
type Item = FunctionReturnType<typeof api.commitments.list>["items"][number];

const dueDay = (item: Item) => String(Number(item.dueDate.slice(8)));

function ErrorLine({ error }: { error: string | null }) {
	if (!error) return null;
	return (
		<Text accessibilityRole="alert" className="mt-3 text-[13px] text-warning-foreground">
			{error}
		</Text>
	);
}

/** «Este mes vence… › Día 28», only for a monthly: it opens the days of the charge's month. */
export function DueMonthRow({
	item,
	today,
	onPress,
}: {
	item: Item;
	today: string;
	onPress: () => void;
}) {
	if (!item.rule) return null;
	const title = dueMonthTitle(item.dueDate.slice(0, 7), today);
	return (
		<DayRow
			label={title}
			value={`Día ${dueDay(item)}`}
			accessibilityLabel={`${title} Día ${dueDay(item)}. Cambiar`}
			onPress={onPress}
		/>
	);
}

/** Any day of the charge's month, also a past one, like the web's calendar. It saves on the pick. */
export function DueMonthList({
	space,
	item,
	today,
	onDone,
}: {
	space: Space;
	item: Item;
	today: string;
	onDone: () => void;
}) {
	const actions = useCommitmentActions(space);
	const month = item.dueDate.slice(0, 7);
	if (!item.rule) return null;

	async function pick(day: string) {
		if (await actions.run({ kind: "setDue", id: item.id, month, day: Number(day) })) onDone();
	}

	return (
		<View>
			<SheetHeader title={dueMonthTitle(month, today)} sub={dueMonthText(month, item.rule)} />
			<View className="mt-1.5">
				<OptionList
					options={monthDayOptions(month)}
					value={dueDay(item)}
					onPick={(day) => void pick(day)}
				/>
			</View>
			<ErrorLine error={actions.error} />
		</View>
	);
}

/** «Borrar compromiso» in amber under the save button, like «Eliminar gasto» in Registrar. */
export function RemoveLink({ onPress }: { onPress: () => void }) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			className="mt-3.5 min-h-11 items-center justify-center active:opacity-60"
		>
			<Text className="text-[13.5px] font-medium text-warning-foreground underline">
				Borrar compromiso
			</Text>
		</Pressable>
	);
}

/** The web's confirmation, in the same sheet like D4. */
export function RemoveConfirm({
	space,
	item,
	onCancel,
	onDone,
}: {
	space: Space;
	item: Item;
	onCancel: () => void;
	onDone: () => void;
}) {
	const actions = useCommitmentActions(space);

	async function remove() {
		if (await actions.run({ kind: "remove", id: item.id })) onDone();
	}

	return (
		<View>
			<Text className="text-[28px] leading-8 font-semibold text-foreground">
				¿Borrar el compromiso?
			</Text>
			<Text className="mt-2 text-sm leading-5 text-muted-foreground">
				«{item.name}» deja de reservar dinero. Los pagos que ya hiciste se quedan en Movimientos.
			</Text>
			<ErrorLine error={actions.error} />
			<View className="mt-6 mb-2 gap-2">
				<Button
					label="Borrar compromiso"
					variant="warning"
					loading={actions.pending}
					onPress={() => void remove()}
				/>
				<Button
					label="Mantener compromiso"
					variant="secondary"
					disabled={actions.pending}
					onPress={onCancel}
				/>
			</View>
		</View>
	);
}
