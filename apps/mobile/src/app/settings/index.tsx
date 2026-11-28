import DateTimePicker from "@expo/ui/community/datetime-picker";
import type { api } from "@quipu/backend/convex/_generated/api";
import {
	isOwnPurchase,
	planRowLine,
	type PlusHistory,
	type PlusStatus,
} from "@quipu/backend/shared/billing";
import { formatDay, getLimaDate } from "@quipu/backend/shared/dates";
import { runsAtFor } from "@quipu/backend/shared/deletion";
import type { Split } from "@quipu/backend/shared/plan";
import type { FunctionReturnType } from "convex/server";
import { router, useFocusEffect } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ArrowUpRightSquare from "reicon-react-native/icons/ArrowUpRightSquare";
import { Uniwind, useUniwind } from "uniwind";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionLabel } from "@/components/ui/section-label";
import { Segmented } from "@/components/ui/segmented";
import { type Cycle, cycleRowValue, splitRowValue } from "@/features/cycle/cycle-days";
import {
	askPostNotifications,
	canPostNotifications,
} from "@/features/detection/notification-permission";
import { SAMPLE_HOME, SAMPLE_TODAY } from "@/features/home/sample";
import { SAMPLE_HOUSEHOLD_HOME } from "@/features/household/sample";
import { sampleStatus } from "@/features/plus/sample";
import { ConfirmSheet } from "@/features/settings/confirm-sheet";
import { PRIVACY_URL, TERMS_URL } from "@/features/settings/links";
import {
	SAMPLE_CYCLE,
	SAMPLE_EMAIL,
	SAMPLE_HOUSEHOLD,
	SAMPLE_PROFILE,
} from "@/features/settings/sample";
import { CycleSheet, DeleteSheet, SpaceNameSheet } from "@/features/settings/settings-sheets";
import { signOut } from "@/features/settings/sign-out";
import { useThemeColor } from "@/lib/use-theme-color";
import {
	DEFAULT_REMINDER,
	getReminder,
	isAccessEnabled,
	setReminder,
} from "../../../modules/quipu-detection";

const MODES = ["system", "light", "dark"] as const;

function Appearance() {
	const { theme, hasAdaptiveThemes } = useUniwind();
	const selected = hasAdaptiveThemes ? 0 : theme === "dark" ? 2 : 1;

	return (
		<Segmented
			options={["Sistema", "Claro", "Oscuro"]}
			selectedIndex={selected}
			onChange={(index) => Uniwind.setTheme(MODES[index])}
		/>
	);
}

function DetectionRow({ onOpen }: { onOpen: () => void }) {
	const foreground = useThemeColor("--color-foreground");
	const background = useThemeColor("--color-background");
	const [access, setAccess] = useState(false);

	useFocusEffect(() => {
		setAccess(isAccessEnabled());
	});

	return (
		<ListRow
			label="Detección de gastos"
			sub={access ? "Activa en tu teléfono" : undefined}
			onPress={onOpen}
			right={
				<Switch
					value={access}
					onValueChange={onOpen}
					trackColor={{ true: foreground }}
					thumbColor={background}
					accessibilityLabel="Detección de gastos"
				/>
			}
		/>
	);
}

function clockText(hour: number, minute: number) {
	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function useReminder() {
	const [reminder, setReminderState] = useState(DEFAULT_REMINDER);
	const [denied, setDenied] = useState(false);

	useEffect(() => {
		let alive = true;
		void Promise.all([getReminder(), canPostNotifications()]).then(([saved, canPost]) => {
			if (!alive) return;
			setReminderState(saved);
			setDenied(saved.enabled && !canPost);
		});
		return () => {
			alive = false;
		};
	}, []);

	async function toggle(enabled: boolean) {
		const granted = !enabled || (await askPostNotifications());
		setDenied(!granted);
		if (!granted) return;
		setReminderState({ ...reminder, enabled });
		await setReminder(enabled, reminder.hour, reminder.minute);
	}

	async function setTime(hour: number, minute: number) {
		setReminderState({ ...reminder, hour, minute });
		await setReminder(reminder.enabled, hour, minute);
	}

	return { reminder, denied, toggle, setTime };
}

function ReminderRow() {
	const primary = useThemeColor("--color-primary");
	const { reminder, denied, toggle, setTime } = useReminder();
	const [picking, setPicking] = useState<Date | null>(null);

	function openPicker() {
		const time = new Date();
		time.setHours(reminder.hour, reminder.minute, 0, 0);
		setPicking(time);
	}

	return (
		<View>
			<ListRow
				label="Recordatorio diario"
				sub={`A las ${clockText(reminder.hour, reminder.minute)}`}
				onPress={openPicker}
				right={
					<Switch
						value={reminder.enabled}
						onValueChange={(enabled) => void toggle(enabled)}
						trackColor={{ true: primary }}
						accessibilityLabel="Recordatorio diario"
					/>
				}
			/>
			{denied ? (
				<Pressable
					accessibilityRole="button"
					onPress={() => void Linking.openSettings()}
					className="min-h-11 justify-center active:opacity-60"
				>
					<Text className="text-[13px] text-warning-foreground underline">
						Activa las notificaciones en Ajustes
					</Text>
				</Pressable>
			) : null}
			{picking ? (
				<DateTimePicker
					mode="time"
					is24Hour
					value={picking}
					accentColor={primary}
					onValueChange={(_, picked) => {
						setPicking(null);
						void setTime(picked.getHours(), picked.getMinutes());
					}}
					onDismiss={() => setPicking(null)}
				/>
			) : null}
		</View>
	);
}

type Household = NonNullable<FunctionReturnType<typeof api.household.get>>;

const limaDay = (ms: number) => formatDay(getLimaDate(new Date(ms)));

function SpaceGroup({
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
			<View className="mt-8">
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
						<Button label="Volver a enviar invitación" variant="secondary" onPress={() => {}} />
					</View>
				</>
			)}
			<View className="mt-8">
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

type Space = { partnerName: string | null; plus: { payerIsMe: boolean } };

function deletionDate(today: string) {
	return formatDay(getLimaDate(new Date(runsAtFor(today))));
}

function deletionLines({
	space,
	plusHistory,
	status,
	today,
}: {
	space: Space | null;
	plusHistory: PlusHistory;
	status: PlusStatus;
	today: string;
}) {
	const partner = space?.partnerName ?? null;
	const lines = [
		space ? "Saldrás de Nuestro espacio." : null,
		space && partner ? `Lo que anotaste ahí se queda para ${partner}.` : null,
		space && partner && space.plus.payerIsMe
			? `${partner} perderá Plus el ${deletionDate(today)}.`
			: null,
		plusHistory === "paid"
			? "El registro de tus pagos queda en la plataforma donde pagaste."
			: null,
	].filter((line): line is string => line !== null);

	return { lines, stillPaying: isOwnPurchase(status) };
}

type Sheet = "cycle" | "spaceCycle" | "spaceName" | "signOut" | "delete";

function Group({ title, children }: { title: string; children: ReactNode }) {
	return (
		<View>
			<View className="mt-8">
				<SectionLabel>{title}</SectionLabel>
			</View>
			{children}
		</View>
	);
}

export default function SettingsScreen() {
	const insets = useSafeAreaInsets();
	const [sheet, setSheet] = useState<Sheet | null>(null);
	const [cycle, setCycle] = useState<Cycle>(SAMPLE_CYCLE);
	const [spaceCycle, setSpaceCycle] = useState<Cycle>(SAMPLE_HOUSEHOLD.cycle);
	const [spaceName, setSpaceName] = useState(SAMPLE_HOUSEHOLD.name);
	const muted = useThemeColor("--color-muted-foreground");
	const external = <ArrowUpRightSquare size={18} color={muted} />;
	const status = sampleStatus(undefined);
	const close = () => setSheet(null);
	function leave() {
		close();
		void signOut();
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

				<View className="mt-8">
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
						right={external}
						onPress={() => void Linking.openURL(PRIVACY_URL)}
					/>
					<ListRow
						label="Términos y condiciones"
						right={external}
						onPress={() => void Linking.openURL(TERMS_URL)}
					/>
				</Group>

				<View className="mt-8">
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
