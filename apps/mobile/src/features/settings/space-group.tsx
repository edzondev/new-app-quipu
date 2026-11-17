import type { api } from "@quipu/backend/convex/_generated/api";
import { formatDay, getLimaDate } from "@quipu/backend/shared/dates";
import type { Split } from "@quipu/backend/shared/plan";
import type { FunctionReturnType } from "convex/server";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { SectionLabel } from "@/components/ui/section-label";
import { type Cycle, cycleRowValue, splitRowValue } from "@/features/cycle/days";

type Household = NonNullable<FunctionReturnType<typeof api.household.get>>;

const limaDay = (ms: number) => formatDay(getLimaDate(new Date(ms)));

/** L1c: the space's name, who is in it and its own cycle. Only shows when the space exists. */
export function SpaceGroup({
	household,
	name,
	cycle,
	split,
	myName,
	onName,
	onCycle,
}: {
	household: Household;
	name: string | null;
	cycle: Cycle;
	split: Split;
	myName: string;
	onName: () => void;
	onCycle: () => void;
}) {
	const { partnerName, partnerJoinedAt, invite } = household;

	return (
		<View>
			<View className="mt-5">
				<SectionLabel>Nuestro espacio</SectionLabel>
			</View>
			<ListRow label="Nombre" value={name ?? "Nuestro espacio"} onPress={onName} />
			<ListRow label={myName} sub="Tú" />
			{partnerName && partnerJoinedAt ? (
				<ListRow label={`${partnerName} · se unió el ${limaDay(partnerJoinedAt)}`} />
			) : (
				<>
					<ListRow
						label="Tu pareja"
						sub={
							invite ? `Invitación pendiente · vence el ${limaDay(invite.expiresAt)}` : undefined
						}
					/>
					<View className="mt-3">
						{/* Luego: household.createInvite. */}
						<Button label="Volver a enviar invitación" variant="secondary" onPress={() => {}} />
					</View>
				</>
			)}
			<View className="mt-5">
				<SectionLabel>Ciclo del espacio</SectionLabel>
			</View>
			<ListRow label="Ciclo" value={cycleRowValue(cycle)} onPress={onCycle} />
			<ListRow label="Reparto" value={splitRowValue(split)} />
			<Text className="mt-3 text-[13px] text-muted-foreground">
				Los dos pueden cambiar el nombre, el ciclo y el reparto del espacio.
			</Text>
		</View>
	);
}
