import { planRowLine } from "@quipu/backend/shared/billing";
import { router } from "expo-router";
import { type ReactNode, useState } from "react";
import { Linking, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/ui/avatar";
import { ListRow } from "@/components/ui/list-row";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionLabel } from "@/components/ui/section-label";
import { type Cycle, cycleRowValue, splitRowValue } from "@/features/cycle/days";
import { SAMPLE_HOME, SAMPLE_TODAY } from "@/features/home/sample";
import { SAMPLE_HOUSEHOLD_HOME } from "@/features/household/sample";
import { sampleStatus } from "@/features/plus/sample";
import { Appearance } from "./appearance";
import { ConfirmSheet } from "./confirm-sheet";
import { CycleSheet } from "./cycle-sheet";
import { DeleteSheet } from "./delete-sheet";
import { deletionDate, deletionLines } from "./deletion-text";
import { DetectionRow } from "./detection-row";
import { PRIVACY_URL, TERMS_URL } from "./links";
import { ReminderRow } from "./reminder-row";
import { SAMPLE_CYCLE, SAMPLE_EMAIL, SAMPLE_HOUSEHOLD, SAMPLE_PROFILE } from "./sample";
import { leaveToSignIn } from "./session";
import { SpaceGroup } from "./space-group";
import { SpaceNameSheet } from "./space-name-sheet";

type Sheet = "cycle" | "spaceCycle" | "spaceName" | "signOut" | "delete";

function Group({ title, children }: { title: string; children: ReactNode }) {
	return (
		<View>
			<View className="mt-5">
				<SectionLabel>{title}</SectionLabel>
			</View>
			{children}
		</View>
	);
}

export function SettingsScreen() {
	const insets = useSafeAreaInsets();
	const [sheet, setSheet] = useState<Sheet | null>(null);
	const [cycle, setCycle] = useState<Cycle>(SAMPLE_CYCLE);
	const [spaceCycle, setSpaceCycle] = useState<Cycle>(SAMPLE_HOUSEHOLD.cycle);
	const [spaceName, setSpaceName] = useState(SAMPLE_HOUSEHOLD.name);
	const status = sampleStatus(undefined);
	const close = () => setSheet(null);
	function leave() {
		close();
		leaveToSignIn();
	}
	const { lines, stillPaying } = deletionLines({
		space: SAMPLE_PROFILE.hasHousehold ? SAMPLE_HOUSEHOLD : null,
		plusHistory: SAMPLE_PROFILE.plusHistory,
		status,
		today: SAMPLE_TODAY,
	});

	return (
		<View className="flex-1 bg-background">
			<ScrollView
				contentContainerClassName="px-6"
				contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
			>
				<ScreenHeader title="Ajustes" />

				<View className="mt-2 flex-row items-center gap-3.5">
					<Avatar name={SAMPLE_PROFILE.name} large />
					<View className="min-w-0 flex-1">
						<Text className="text-[17px] font-semibold text-foreground" numberOfLines={1}>
							{SAMPLE_PROFILE.name}
						</Text>
						<Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
							{SAMPLE_EMAIL}
						</Text>
					</View>
				</View>

				<View className="mt-5">
					<SectionLabel>Apariencia</SectionLabel>
				</View>
				<View className="mt-2">
					<Appearance />
				</View>

				<Group title="Tu ciclo">
					<ListRow label="Ciclo" value={cycleRowValue(cycle)} onPress={() => setSheet("cycle")} />
					<ListRow label="Reparto" value={splitRowValue(SAMPLE_HOME.split)} />
				</Group>

				{SAMPLE_PROFILE.hasHousehold ? (
					<SpaceGroup
						household={SAMPLE_HOUSEHOLD}
						name={spaceName}
						cycle={spaceCycle}
						split={SAMPLE_HOME.split}
						myName={SAMPLE_PROFILE.name}
						onName={() => setSheet("spaceName")}
						onCycle={() => setSheet("spaceCycle")}
					/>
				) : null}

				<Group title="Celular">
					{Platform.OS === "android" ? (
						<>
							<DetectionRow onOpen={() => router.push("/detection")} />
							<ReminderRow />
						</>
					) : null}
					<ListRow
						label="Seguridad"
						value="Huella o rostro y sesiones"
						onPress={() => router.push("/settings/security")}
					/>
				</Group>

				<Group title="Suscripción">
					<ListRow
						label="Tu plan"
						value={planRowLine(status, SAMPLE_TODAY)}
						onPress={() => router.push("/plan")}
					/>
				</Group>

				<Group title="Sesión">
					<ListRow label="Cerrar sesión" onPress={() => setSheet("signOut")} />
				</Group>

				<Group title="Legal">
					<ListRow
						label="Política de privacidad"
						onPress={() => void Linking.openURL(PRIVACY_URL)}
					/>
					<ListRow label="Términos y condiciones" onPress={() => void Linking.openURL(TERMS_URL)} />
				</Group>

				<View className="mt-5">
					<ListRow label="Eliminar cuenta" warning onPress={() => setSheet("delete")} />
				</View>
			</ScrollView>

			<CycleSheet
				isPresented={sheet === "cycle"}
				onDismiss={close}
				cycle={cycle}
				currentEndDate={SAMPLE_HOME.endDate}
				onSave={setCycle}
			/>
			<CycleSheet
				isPresented={sheet === "spaceCycle"}
				onDismiss={close}
				cycle={spaceCycle}
				currentEndDate={SAMPLE_HOUSEHOLD_HOME.endDate}
				onSave={setSpaceCycle}
			/>
			<SpaceNameSheet
				isPresented={sheet === "spaceName"}
				onDismiss={close}
				name={spaceName}
				partnerName={SAMPLE_HOUSEHOLD.partnerName}
				myName={SAMPLE_PROFILE.name}
				onSave={setSpaceName}
			/>
			<ConfirmSheet
				isPresented={sheet === "signOut"}
				onDismiss={close}
				title="¿Cerrar sesión?"
				confirmLabel="Cerrar sesión"
				onConfirm={leave}
			/>
			<DeleteSheet
				isPresented={sheet === "delete"}
				onDismiss={close}
				email={SAMPLE_EMAIL}
				date={deletionDate(SAMPLE_TODAY)}
				lines={lines}
				stillPaying={stillPaying}
				onConfirm={leave}
			/>
		</View>
	);
}
