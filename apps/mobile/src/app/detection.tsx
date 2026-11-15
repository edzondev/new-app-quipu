import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { askPostNotifications } from "@/features/detection/android";
import { BanksStep } from "@/features/detection/banks-step";
import { BlockedStep } from "@/features/detection/blocked-step";
import { ConsentStep } from "@/features/detection/consent-step";
import { HomeStep } from "@/features/detection/home-step";
import {
	getBanks,
	getReminder,
	isAccessEnabled,
	openAccessSettings,
	setChosenBanks,
	setReminder,
	type Bank,
} from "../../modules/quipu-detection";

type Step = "home" | "banks" | "consent" | "blocked";

export default function DetectionScreen() {
	const insets = useSafeAreaInsets();
	const [step, setStep] = useState<Step>("home");
	const [banks, setBanks] = useState<Bank[]>([]);
	const [ready, setReady] = useState(false);
	const [access, setAccess] = useState(false);
	const [reminderOn, setReminderOn] = useState(false);
	const [hour, setHour] = useState(23);
	const [minute, setMinute] = useState(30);
	const [picked, setPicked] = useState<string[] | null>(null);
	const arm = useRef(false);
	const waiting = useRef(false);

	useEffect(() => {
		let alive = true;
		void Promise.all([getBanks(), getReminder()]).then(([rows, saved]) => {
			if (!alive) return;
			setBanks(rows);
			setReminderOn(saved.enabled);
			setHour(saved.hour);
			setMinute(saved.minute);
			setAccess(isAccessEnabled());
			setReady(true);
		});
		return () => {
			alive = false;
		};
	}, []);

	useEffect(() => {
		const sub = AppState.addEventListener("change", (state) => {
			if (state === "background" && arm.current) {
				arm.current = false;
				waiting.current = true;
			}
			if (state === "active" && waiting.current) {
				waiting.current = false;
				const enabled = isAccessEnabled();
				setAccess(enabled);
				setStep(enabled ? "home" : "blocked");
			}
		});
		return () => sub.remove();
	}, []);

	const selected =
		picked ?? banks.filter((bank) => bank.chosen && bank.installed).map((bank) => bank.packageName);

	function close() {
		if (router.canGoBack()) router.back();
		else router.replace("/(tabs)");
	}

	function openSettings() {
		arm.current = true;
		openAccessSettings();
	}

	async function accept() {
		await askPostNotifications();
		openSettings();
	}

	async function toggleReminder(enabled: boolean) {
		if (enabled) {
			const granted = await askPostNotifications();
			if (!granted) return;
		}
		setReminderOn(enabled);
		await setReminder(enabled, hour, minute);
	}

	function toggleBank(packageName: string) {
		setPicked((current) => {
			const base =
				current ??
				banks.filter((bank) => bank.chosen && bank.installed).map((bank) => bank.packageName);
			return base.includes(packageName)
				? base.filter((id) => id !== packageName)
				: [...base, packageName];
		});
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
							<Button label="Cerrar" onPress={close} />
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
					<BlockedStep onOpenSettings={openSettings} onManual={close} />
				) : (
					<HomeStep
						banks={banks}
						access={access}
						reminderOn={reminderOn}
						hour={hour}
						minute={minute}
						onToggleReminder={(enabled) => void toggleReminder(enabled)}
						onChooseBanks={() => setStep("banks")}
						onClose={close}
					/>
				)}
			</ScrollView>
		</View>
	);
}
