import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Trash from "reicon-react-native/icons/Trash";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionLabel } from "@/components/ui/section-label";
import { ConfirmSheet } from "@/features/settings/confirm-sheet";
import { type Device, SAMPLE_PASSKEYS, SAMPLE_SESSIONS } from "@/features/settings/sample";
import { signOut } from "@/features/settings/sign-out";
import { useThemeColor } from "@/lib/use-theme-color";

function DeviceRow({ device, onRemove }: { device: Device; onRemove?: () => void }) {
	const muted = useThemeColor("--color-muted-foreground");

	return (
		<View className="min-h-14 flex-row items-center gap-2 border-b border-border">
			<View className="min-w-0 flex-1 py-2.5">
				<Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
					{device.name}
				</Text>
				<Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
					{device.detail}
				</Text>
			</View>
			{onRemove ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`Quitar ${device.name}`}
					onPress={onRemove}
					className="size-11 items-center justify-center active:opacity-60"
				>
					<Trash size={18} color={muted} />
				</Pressable>
			) : null}
		</View>
	);
}

export default function SecurityScreen() {
	const insets = useSafeAreaInsets();
	const [passkeys, setPasskeys] = useState(SAMPLE_PASSKEYS);
	const [removing, setRemoving] = useState<Device | null>(null);
	const [closingAll, setClosingAll] = useState(false);

	return (
		<View className="flex-1 bg-background">
			<ScrollView
				contentContainerClassName="px-6"
				contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
			>
				<ScreenHeader title="Seguridad" />

				<View className="mt-4">
					<SectionLabel>Dispositivos con huella o rostro</SectionLabel>
				</View>
				{passkeys.length === 0 ? (
					<Text className="mt-3 text-sm text-muted-foreground">
						Todavía no activas huella o rostro.
					</Text>
				) : (
					passkeys.map((device) => (
						<DeviceRow key={device.id} device={device} onRemove={() => setRemoving(device)} />
					))
				)}
				<View className="mt-4">
					<Button label="Activar huella o rostro" variant="secondary" onPress={() => {}} />
				</View>

				<View className="mt-8">
					<SectionLabel>Sesiones activas</SectionLabel>
				</View>
				{SAMPLE_SESSIONS.map((device) => (
					<DeviceRow key={device.id} device={device} />
				))}
				<View className="mt-4">
					<Button
						label="Cerrar todas las sesiones"
						variant="secondary"
						onPress={() => setClosingAll(true)}
					/>
				</View>
			</ScrollView>

			<ConfirmSheet
				isPresented={removing !== null}
				onDismiss={() => setRemoving(null)}
				title="¿Quitar este dispositivo?"
				body="Ya no podrás entrar con huella o rostro en este dispositivo. Siempre puedes entrar con un código al correo."
				confirmLabel="Quitar dispositivo"
				onConfirm={() => {
					setPasskeys((rows) => rows.filter((row) => row.id !== removing?.id));
					setRemoving(null);
				}}
			/>
			<ConfirmSheet
				isPresented={closingAll}
				onDismiss={() => setClosingAll(false)}
				title="¿Cerrar todas las sesiones?"
				body="También saldrás de este dispositivo."
				confirmLabel="Cerrar todas"
				onConfirm={() => {
					setClosingAll(false);
					void signOut();
				}}
			/>
		</View>
	);
}
