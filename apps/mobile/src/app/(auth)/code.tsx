import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AngleLeft from "reicon-react-native/icons/AngleLeft";
import { PasskeySheet } from "@/features/auth/passkey-sheet";
import { SAMPLE_CODE, SAMPLE_RESEND_SECONDS, WRONG_CODE_MESSAGE } from "@/features/auth/sample";
import { CODE_LENGTH, formatClock, otpDigits } from "@/features/auth/validation";
import { useThemeColor } from "@/lib/use-theme-color";

const BOXES = Array.from({ length: CODE_LENGTH }, (_, index) => index);

export default function CodeScreen() {
	const insets = useSafeAreaInsets();
	const { email } = useLocalSearchParams<{ email: string }>();
	const [code, setCode] = useState("");
	const [wrong, setWrong] = useState(false);
	const foreground = useThemeColor("--color-foreground");

	function change(text: string) {
		const next = otpDigits(text);
		setCode(next);
		setWrong(next.length === CODE_LENGTH && next !== SAMPLE_CODE);
	}

	function finish() {
		router.dismissAll();
		router.replace("/onboarding");
	}

	function boxLine(index: number) {
		if (wrong) return "border-b-2 border-warning";
		return index === code.length ? "border-b-2 border-foreground" : "border-b border-input";
	}

	return (
		<KeyboardAvoidingView
			className="flex-1 bg-background"
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<ScrollView
				contentContainerClassName="px-6"
				contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 12 }}
				keyboardShouldPersistTaps="handled"
			>
				<View className="h-11 justify-center">
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Volver"
						onPress={() => router.back()}
						className="size-11 justify-center"
					>
						<AngleLeft size={22} color={foreground} />
					</Pressable>
				</View>

				<Text className="mt-6 text-4xl leading-10 font-semibold text-foreground">
					Revisa tu correo
				</Text>
				<Text className="mt-3 text-sm text-muted-foreground">
					Te mandamos un código de 6 dígitos a{" "}
					<Text className="font-semibold text-foreground">{email}</Text>.
				</Text>

				<View className="mt-8">
					<View className="flex-row gap-2.5">
						{BOXES.map((index) => (
							<View
								key={index}
								className={`h-[60px] flex-1 items-center justify-center ${boxLine(index)}`}
							>
								<Text maxFontSizeMultiplier={1.4} className="font-mono text-[28px] text-foreground">
									{code[index] ?? ""}
								</Text>
							</View>
						))}
					</View>
					<TextInput
						className="absolute inset-0 opacity-0"
						autoFocus
						keyboardType="number-pad"
						autoComplete="one-time-code"
						textContentType="oneTimeCode"
						value={code}
						onChangeText={change}
						accessibilityLabel="Código de 6 dígitos"
					/>
				</View>

				{wrong ? (
					<Text accessibilityRole="alert" className="mt-3 text-[13px] text-warning-foreground">
						{WRONG_CODE_MESSAGE}
					</Text>
				) : null}

				<Text className="mt-4 text-[13px] text-muted-foreground">Vence en 5 minutos.</Text>

				<View className="flex-row flex-wrap items-center justify-between gap-x-6">
					{wrong ? (
						// Luego: reenviar al conectar Convex.
						<Pressable accessibilityRole="button" className="min-h-11 justify-center">
							<Text className="text-[13px] font-semibold text-foreground underline">
								Reenviar código
							</Text>
						</Pressable>
					) : (
						<Text className="min-h-11 py-3 font-mono text-[13px] text-muted-foreground">
							Reenviar en {formatClock(SAMPLE_RESEND_SECONDS)}
						</Text>
					)}
					<Pressable
						accessibilityRole="button"
						onPress={() => router.back()}
						className="min-h-11 justify-center"
					>
						<Text className="text-[13px] font-semibold text-foreground underline">Cambiar</Text>
					</Pressable>
				</View>
			</ScrollView>
			<PasskeySheet isPresented={code === SAMPLE_CODE} onDismiss={finish} />
		</KeyboardAvoidingView>
	);
}
