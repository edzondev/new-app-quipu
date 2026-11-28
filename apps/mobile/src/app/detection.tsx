import { router } from "expo-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { AppState, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
	askPostNotifications,
	canPostNotifications,
} from "@/features/detection/notification-permission";
import { FREE_BANKS, trialStartedText, usePlus } from "@/features/plus/plus";
import { PlusSheet } from "@/features/plus/plus-sheet";
import {
	type Bank,
	getBanks,
	isAccessEnabled,
	openAccessSettings,
	setChosenBanks,
} from "../../modules/quipu-detection";

function NumberedLines({ lines }: { lines: readonly string[] }) {
	return (
		<View className="mt-5 gap-3">
			{lines.map((line, index) => (
				<View key={line} className="flex-row gap-3">
					<Text className="font-mono text-[13px] text-muted-foreground">0{index + 1}</Text>
					<Text className="flex-1 text-[15px] text-foreground">{line}</Text>
				</View>
			))}
		</View>
	);
}

function ReadsBlock() {
	return (
		<View className="mt-6 rounded-2xl border border-border px-4 py-3">
			<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
				Qué lee Quipu
			</Text>
			<Text className="mt-2 text-[15px] text-foreground">
				Quipu lee el texto de los avisos de los bancos que elijas, en tu teléfono, solo para sacar
				el monto y el comercio. No guarda ese texto ni lo envía a ningún lado.
			</Text>
			<Text className="mt-2 text-[15px] text-foreground">
				Lo usamos solo para proponerte gastos e ingresos. No se comparte con nadie.
			</Text>
		</View>
	);
}

function RestrictedSettingsNote() {
	return (
		<Text className="mt-4 text-[13px] text-muted-foreground">
			Si instalaste Quipu por un enlace, Android puede bloquear este permiso. En la ficha de la app,
			abre el menú ⋮ y toca «Permitir ajustes restringidos».
		</Text>
	);
}

const LINES = [
	"Cuando tu banco te avisa de un gasto, Quipu lo prepara por ti.",
	"Solo lee las apps que tú elijas. Nada más.",
	"Nada se guarda sin que lo confirmes.",
];

function ConsentStep({ onAccept, onSkip }: { onAccept: () => void; onSkip: () => void }) {
	return (
		<View>
			<Text className="text-2xl font-semibold text-foreground">
				Anota tus gastos sin escribirlos
			</Text>
			<NumberedLines lines={LINES} />
			<ReadsBlock />
			<RestrictedSettingsNote />
			<View className="mt-6 gap-3">
				<Button label="Aceptar e ir a Ajustes" onPress={onAccept} />
				<Button label="Ahora no" variant="secondary" onPress={onSkip} />
			</View>
		</View>
	);
}

const STEPS = [
	"Android te muestra una lista.",
	"Busca Quipu y actívalo.",
	"Si Android avisa, es un mensaje genérico. Quipu solo lee los bancos que elegiste.",
];

function BlockedStep({
	onOpenSettings,
	onManual,
}: {
	onOpenSettings: () => void;
	onManual: () => void;
}) {
	return (
		<View>
			<Text className="text-2xl font-semibold text-foreground">
				Quipu no puede leer los avisos de tu banco
			</Text>
			<NumberedLines lines={STEPS} />
			<ReadsBlock />
			<RestrictedSettingsNote />
			<View className="mt-6 gap-3">
				<Button label="Abrir Ajustes del teléfono" onPress={onOpenSettings} />
				<Button label="Seguir registrando a mano" variant="secondary" onPress={onManual} />
			</View>
		</View>
	);
}

function BanksStep({
	banks,
	selected,
	onToggle,
	onContinue,
	onBack,
}: {
	banks: Bank[];
	selected: string[];
	onToggle: (packageName: string) => void;
	onContinue: () => void;
	onBack: () => void;
}) {
	const installed = banks.filter((bank) => bank.installed);
	const missing = banks.filter((bank) => !bank.installed);

	return (
		<View>
			<Text className="text-2xl font-semibold text-foreground">Elige tus bancos</Text>
			{installed.length > 0 ? (
				<Section title="En tu teléfono">
					{installed.map((bank) => (
						<Row
							key={bank.packageName}
							bank={bank}
							selected={selected.includes(bank.packageName)}
							onPress={() => onToggle(bank.packageName)}
						/>
					))}
				</Section>
			) : null}
			{missing.length > 0 ? (
				<Section title="Otros">
					{missing.map((bank) => (
						<Row key={bank.packageName} bank={bank} selected={false} />
					))}
				</Section>
			) : null}
			<View className="mt-6 gap-3">
				<Button
					label={`Continuar (${selected.length})`}
					disabled={selected.length === 0}
					onPress={onContinue}
				/>
				<Button label="Atrás" variant="secondary" onPress={onBack} />
			</View>
		</View>
	);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<View className="mt-5">
			<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
				{title}
			</Text>
			<View className="mt-1">{children}</View>
		</View>
	);
}

function Row({ bank, selected, onPress }: { bank: Bank; selected: boolean; onPress?: () => void }) {
	const installed = bank.installed;
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected, disabled: !installed }}
			disabled={!installed}
			onPress={onPress}
			className="min-h-12 flex-row items-center border-b border-border active:opacity-60"
		>
			<View className="flex-1 py-2">
				<Text
					className={installed ? "text-base text-foreground" : "text-base text-muted-foreground"}
				>
					{bank.name}
				</Text>
				{installed ? null : <Text className="text-[13px] text-muted-foreground">No instalado</Text>}
			</View>
			{selected ? <Text className="text-primary">✓</Text> : null}
		</Pressable>
	);
}

function DetectionStatusStep({
	banks,
	access,
	notifications,
	paused,
	onChooseBanks,
	onChangePaused,
	onClose,
}: {
	banks: Bank[];
	access: boolean;
	notifications: boolean;
	paused: string[];
	onChooseBanks: () => void;
	onChangePaused: () => void;
	onClose: () => void;
}) {
	const pausedBanks = banks.filter((bank) => paused.includes(bank.packageName));
	const chosen = banks
		.filter((bank) => bank.chosen && !paused.includes(bank.packageName))
		.map((bank) => bank.name);

	return (
		<View>
			<View className="mb-2 flex-row items-center justify-between">
				<Text className="text-2xl font-semibold text-foreground">Detección de gastos</Text>
				<Pressable
					accessibilityRole="button"
					onPress={onClose}
					className="px-2 py-2 active:opacity-60"
				>
					<Text className="text-[15px] text-muted-foreground">Cerrar</Text>
				</Pressable>
			</View>

			{notifications ? null : (
				<Pressable
					accessibilityRole="button"
					onPress={() => void Linking.openSettings()}
					className="mt-4 active:opacity-60"
				>
					<Text className="text-[15px] text-warning-foreground underline">
						Activa las notificaciones en Ajustes
					</Text>
				</Pressable>
			)}

			<Text className="mt-4 text-[15px] text-muted-foreground">
				{access && chosen.length > 0
					? `Quipu leerá ${chosen.join(", ")}.`
					: "Quipu prepara el gasto cuando tu banco te avisa."}
			</Text>

			{pausedBanks.length > 0 ? (
				<View className="mt-4">
					{pausedBanks.map((bank) => (
						<View
							key={bank.packageName}
							className="min-h-12 flex-row items-center justify-between gap-2 border-b border-border"
						>
							<View className="min-w-0 flex-1 py-2">
								<Text className="text-base text-foreground">{bank.name}</Text>
								<Text className="text-[13px] text-muted-foreground">No detectamos sus gastos</Text>
							</View>
							<Text className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
								Pausado
							</Text>
						</View>
					))}
					<View className="mt-3">
						<Button label="Cambiar mis 2 bancos" variant="secondary" onPress={onChangePaused} />
					</View>
				</View>
			) : null}

			<View className="mt-6">
				<Button label="Elegir bancos" onPress={onChooseBanks} />
			</View>
		</View>
	);
}

// The sheet unmounts its content when it closes: each opening starts from the banks kept so far.
function PickBanks({
	banks,
	kept,
	onSave,
	onPlans,
}: {
	banks: Bank[];
	kept: string[];
	onSave: (kept: string[]) => void;
	onPlans: () => void;
}) {
	const [picked, setPicked] = useState(kept);

	function toggle(packageName: string) {
		setPicked((current) =>
			current.includes(packageName)
				? current.filter((name) => name !== packageName)
				: [...current.slice(0, FREE_BANKS - 1), packageName],
		);
	}

	return (
		<View>
			<Text className="text-3xl font-semibold text-foreground">Elige tus 2 bancos</Text>
			<Text className="mt-2 text-sm text-muted-foreground">
				Sin Plus detectamos gastos de 2 bancos. El otro queda en pausa; no se borra nada.
			</Text>
			<View className="mt-3">
				{banks.map((bank) => {
					const selected = picked.includes(bank.packageName);
					return (
						<Pressable
							key={bank.packageName}
							accessibilityRole="checkbox"
							accessibilityState={{ checked: selected }}
							onPress={() => toggle(bank.packageName)}
							className="min-h-12 flex-row items-center border-b border-border active:opacity-60"
						>
							<View className="flex-1 py-2">
								<Text className="text-base text-foreground">{bank.name}</Text>
								{selected ? null : (
									<Text className="text-[13px] text-muted-foreground">Quedará en pausa</Text>
								)}
							</View>
							{selected ? <Text className="text-primary">✓</Text> : null}
						</Pressable>
					);
				})}
			</View>
			<View className="mt-5 gap-2">
				<Button
					label="Guardar"
					disabled={picked.length !== FREE_BANKS}
					onPress={() => onSave(picked)}
				/>
				<Button label="Ver planes" variant="secondary" onPress={onPlans} />
			</View>
		</View>
	);
}

function PickBanksSheet({
	isPresented,
	onDismiss,
	banks,
	kept,
	onSave,
	onPlans,
}: {
	isPresented: boolean;
	onDismiss: () => void;
	banks: Bank[];
	kept: string[];
	onSave: (kept: string[]) => void;
	onPlans: () => void;
}) {
	return (
		<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
			<PickBanks banks={banks} kept={kept} onSave={onSave} onPlans={onPlans} />
		</BottomSheet>
	);
}

type Step = "home" | "banks" | "consent" | "blocked";

export default function DetectionScreen() {
	const insets = useSafeAreaInsets();
	const { hasPlus } = usePlus();
	const toast = useToast();
	const [plusOpen, setPlusOpen] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [kept, setKept] = useState<string[] | null>(null);
	const [step, setStep] = useState<Step>("home");
	const [banks, setBanks] = useState<Bank[]>([]);
	const [ready, setReady] = useState(false);
	const [access, setAccess] = useState(false);
	const [notifications, setNotifications] = useState(true);
	const [picked, setPicked] = useState<string[] | null>(null);
	const waiting = useRef(false);

	useEffect(() => {
		let alive = true;
		void Promise.all([getBanks(), canPostNotifications()]).then(([rows, canPost]) => {
			if (!alive) return;
			setBanks(rows);
			setNotifications(canPost);
			setAccess(isAccessEnabled());
			const connected = rows.filter((bank) => bank.chosen && bank.installed).length;
			setPickerOpen(!hasPlus && connected > FREE_BANKS);
			setReady(true);
		});
		return () => {
			alive = false;
		};
	}, [hasPlus]);

	useEffect(() => {
		const sub = AppState.addEventListener("change", (state) => {
			if (state !== "active") return;
			const enabled = isAccessEnabled();
			setAccess(enabled);
			void canPostNotifications().then(setNotifications);
			if (!waiting.current) return;
			waiting.current = false;
			setStep(enabled ? "home" : "blocked");
		});
		return () => sub.remove();
	}, []);

	const selected =
		picked ?? banks.filter((bank) => bank.chosen && bank.installed).map((bank) => bank.packageName);

	const keptBanks = kept ?? selected.slice(0, FREE_BANKS);
	const paused = hasPlus ? [] : selected.filter((packageName) => !keptBanks.includes(packageName));
	const chosenBanks = banks.filter((bank) => selected.includes(bank.packageName));

	function openSettings() {
		waiting.current = true;
		openAccessSettings();
	}

	async function accept() {
		setNotifications(await askPostNotifications());
		openSettings();
	}

	function toggleBank(packageName: string) {
		if (!hasPlus && !selected.includes(packageName) && selected.length >= FREE_BANKS) {
			setPlusOpen(true);
			return;
		}
		setPicked(
			selected.includes(packageName)
				? selected.filter((id) => id !== packageName)
				: [...selected, packageName],
		);
	}

	async function continueBanks() {
		await setChosenBanks(selected);
		setBanks((rows) =>
			rows.map((bank) => ({ ...bank, chosen: selected.includes(bank.packageName) })),
		);
		setStep(access ? "home" : "consent");
	}

	return (
		<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
			{step === "blocked" ? <View className="h-1 bg-warning" /> : null}
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-6 pt-[22px]"
				contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
			>
				{!ready ? null : banks.length === 0 ? (
					<View>
						<Text className="text-2xl font-semibold text-foreground">Detección de gastos</Text>
						<Text className="mt-4 text-[15px] text-foreground">
							La detección de gastos está en la app de Android.
						</Text>
						<View className="mt-6">
							<Button label="Cerrar" onPress={() => router.back()} />
						</View>
					</View>
				) : step === "banks" ? (
					<BanksStep
						banks={banks}
						selected={selected}
						onToggle={toggleBank}
						onContinue={() => void continueBanks()}
						onBack={() => setStep("home")}
					/>
				) : step === "consent" ? (
					<ConsentStep onAccept={() => void accept()} onSkip={() => setStep("home")} />
				) : step === "blocked" ? (
					<BlockedStep onOpenSettings={openSettings} onManual={() => router.back()} />
				) : (
					<DetectionStatusStep
						banks={banks}
						access={access}
						notifications={notifications}
						paused={paused}
						onChooseBanks={() => setStep("banks")}
						onChangePaused={() => setPickerOpen(true)}
						onClose={() => router.back()}
					/>
				)}
			</ScrollView>
			<PickBanksSheet
				isPresented={pickerOpen}
				onDismiss={() => setPickerOpen(false)}
				banks={chosenBanks}
				kept={keptBanks}
				onSave={(names) => {
					setKept(names);
					setPickerOpen(false);
				}}
				onPlans={() => {
					setPickerOpen(false);
					setPlusOpen(true);
				}}
			/>
			<PlusSheet
				isPresented={plusOpen}
				onDismiss={() => setPlusOpen(false)}
				feature="banks"
				onTrial={(endsAt) => toast.show(trialStartedText(endsAt))}
			/>
			{toast.view}
		</View>
	);
}
