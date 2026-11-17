import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { CODE_LENGTH, otpDigits } from "@/features/auth/validation";
import { SUBSCRIPTIONS_URL } from "./links";

type Content = {
	email: string;
	date: string;
	lines: string[];
	stillPaying: boolean;
	onConfirm: () => void;
	onClose: () => void;
};

// The sheet unmounts its content when it closes: each opening starts at the notice.
function DeleteContent({ email, date, lines, stillPaying, onConfirm, onClose }: Content) {
	const [step, setStep] = useState<"notice" | "code">("notice");
	const [code, setCode] = useState("");

	if (step === "code") {
		return (
			<View>
				<Text className="text-3xl font-semibold text-foreground">Revisa tu correo</Text>
				<Text className="mt-2 text-sm text-muted-foreground">
					Escribe el código que enviamos a{" "}
					<Text className="font-semibold text-foreground">{email}</Text>.
				</Text>
				<Text className="mt-5 text-xs text-muted-foreground">Código</Text>
				<TextField
					value={code}
					onChangeText={(text) => setCode(otpDigits(text))}
					keyboardType="number-pad"
					autoComplete="one-time-code"
					autoFocus
					accessibilityLabel="Código de 6 dígitos"
				/>
				<Text className="mt-2 text-[13px] text-muted-foreground">Vence en 5 minutos.</Text>
				<View className="mt-5 gap-2">
					<Button
						label="Eliminar cuenta"
						variant="warning"
						disabled={code.length < CODE_LENGTH}
						onPress={onConfirm}
					/>
					<Button label="Cancelar" variant="secondary" onPress={onClose} />
				</View>
			</View>
		);
	}

	return (
		<View>
			<Text className="text-3xl font-semibold text-foreground">Eliminar tu cuenta</Text>
			<Text className="mt-2 text-sm text-muted-foreground">
				El {date} borraremos tu cuenta y tus datos en Quipu. Hasta ese día puedes cancelar.
			</Text>
			<View className="mt-4 gap-2">
				{lines.map((line) => (
					<Text key={line} className="text-sm text-foreground">
						{line}
					</Text>
				))}
			</View>
			{stillPaying ? (
				<View className="mt-4 gap-1">
					<Text className="text-sm font-semibold text-foreground">Tu Quipu Plus sigue activo.</Text>
					<Text className="text-sm text-muted-foreground">
						Cancélalo aparte para que no se te cobre.
					</Text>
					<View className="mt-2">
						<Button
							label="Administrar suscripción"
							variant="secondary"
							onPress={() => void Linking.openURL(SUBSCRIPTIONS_URL)}
						/>
					</View>
				</View>
			) : null}
			<View className="mt-6 gap-2">
				<Button label="Enviar código" variant="warning" onPress={() => setStep("code")} />
				<Button label="Cancelar" variant="secondary" onPress={onClose} />
			</View>
		</View>
	);
}

export function DeleteSheet({
	isPresented,
	onDismiss,
	...content
}: { isPresented: boolean; onDismiss: () => void } & Omit<Content, "onClose">) {
	return (
		<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
			<DeleteContent {...content} onClose={onDismiss} />
		</BottomSheet>
	);
}
