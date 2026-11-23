import { getAuthErrorMessage } from "@quipu/backend/shared/auth-errors";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Fingerprint from "reicon-react-native/icons/Fingerprint";
import { QuipuLogo } from "@/components/quipu-logo";
import { Button } from "@/components/ui/button";
import { KeyboardAvoidingView } from "@/components/ui/keyboard-avoiding-view";
import { PressableScale } from "@/components/ui/pressable-scale";
import { emailError } from "@/features/auth/validation";
import { sendSignInCode } from "@/lib/auth-client";
import { enter, exit } from "@/lib/motion";
import { useThemeColor } from "@/lib/use-theme-color";

export function SignInScreen() {
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [sending, setSending] = useState(false);
	const foreground = useThemeColor("--color-foreground");
	const muted = useThemeColor("--color-muted-foreground");
	async function submit() {
		if (sending) return;
		const problem = emailError(email);
		setError(problem);
		if (problem !== null) return;
		setSending(true);
		try {
			const { error: sendError } = await sendSignInCode(email.trim());
			if (sendError) setError(getAuthErrorMessage(sendError));
			else
				router.push({
					pathname: "/verify-code",
					params: { email: email.trim() },
				});
		} catch {
			setError(getAuthErrorMessage(null));
		} finally {
			setSending(false);
		}
	}

	return (
		<KeyboardAvoidingView className="flex-1 bg-background" behavior="padding">
			<ScrollView
				contentContainerClassName="px-6"
				contentContainerStyle={{
					minHeight: height,
					paddingTop: insets.top + 24,
					paddingBottom: insets.bottom,
				}}
				keyboardShouldPersistTaps="handled"
			>
				<View className="flex-row items-center gap-2">
					<QuipuLogo size={30} />
					<Text className="text-2xl font-semibold text-foreground">Quipu</Text>
				</View>

				<View className="flex-1 justify-center pb-4">
					<Text className="text-[40px] leading-[43px] font-semibold text-foreground">
						Entrar a Quipu
					</Text>

					<Text className="mt-[30px] text-[13.5px] font-medium text-muted-foreground">Correo</Text>
					<TextInput
						className={`min-h-12 border-b pt-2.5 pb-3 text-lg font-medium text-foreground ${error ? "border-warning" : "border-input"}`}
						placeholder="tu@correo.com"
						placeholderTextColor={muted}
						keyboardType="email-address"
						autoCapitalize="none"
						autoCorrect={false}
						autoComplete="email"
						textContentType="emailAddress"
						returnKeyType="send"
						value={email}
						onChangeText={(text) => {
							setEmail(text);
							setError(null);
						}}
						onSubmitEditing={() => void submit()}
						accessibilityLabel="Correo"
					/>
					{error ? (
						<Animated.Text
							entering={enter}
							exiting={exit}
							accessibilityRole="alert"
							className="mt-1.5 text-xs text-warning-foreground"
						>
							{error}
						</Animated.Text>
					) : null}

					<View className="mt-[22px]">
						<Button label="Enviar código" loading={sending} onPress={() => void submit()} />
					</View>

					<View className="my-5 flex-row items-center gap-3.5">
						<View className="h-px flex-1 bg-input" />
						<Text className="text-xs text-muted-foreground">o</Text>
						<View className="h-px flex-1 bg-input" />
					</View>

					<PressableScale
						accessibilityRole="button"
						// Luego: diálogo del sistema (passkey) al conectar Convex.
						className="h-[52px] flex-row items-center justify-center gap-2 rounded-full border border-input px-[26px]"
					>
						<Fingerprint size={20} color={foreground} />
						<Text className="text-[15px] font-semibold text-foreground">
							Entrar con huella o rostro
						</Text>
					</PressableScale>
					<Text className="mt-2.5 text-center text-xs text-muted-foreground">
						Usa el desbloqueo de tu celular.
					</Text>
				</View>

				<View className="flex-row justify-center gap-7 pb-1.5">
					<Pressable
						accessibilityRole="link"
						className="min-h-11 justify-center active:opacity-60"
						onPress={() => void Linking.openURL("https://quipu-finance.app/terminos")}
					>
						<Text className="text-xs text-muted-foreground">Términos</Text>
					</Pressable>
					<Pressable
						accessibilityRole="link"
						className="min-h-11 justify-center active:opacity-60"
						onPress={() => void Linking.openURL("https://quipu-finance.app/privacidad")}
					>
						<Text className="text-xs text-muted-foreground">Privacidad</Text>
					</Pressable>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
