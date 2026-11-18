import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
	askPostNotifications,
	canPostNotifications,
} from "@/features/detection/notification-permission";
import { BanksStep } from "@/features/detection/banks-step";
import { BlockedStep } from "@/features/detection/blocked-step";
import { ConsentStep } from "@/features/detection/consent-step";
import { DetectionStatusStep } from "@/features/detection/status-step";
import { PickBanksSheet } from "@/features/detection/pick-banks-sheet";
import { FREE_BANKS } from "@/features/plus/features";
import { PlusSheet } from "@/features/plus/plus-sheet";
import { trialStartedText } from "@/features/plus/trial";
import { usePlus } from "@/features/plus/use-plus";
import {
	type Bank,
	getBanks,
	isAccessEnabled,
	openAccessSettings,
	setChosenBanks,
} from "../../../modules/quipu-detection";

type Step = "home" | "banks" | "consent" | "blocked";

export function DetectionScreen() {
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
