import * as Linking from "expo-linking";
import { router } from "expo-router";
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
import Fingerprint from "reicon-react-native/icons/Fingerprint";
import { QuipuLogo } from "@/components/quipu-logo";
import { Button } from "@/components/ui/button";
import { getAuthErrorMessage } from "@quipu/backend/shared/auth-errors";
import { emailError } from "@/features/auth/validation";
import { sendSignInCode } from "@/lib/auth-client";
import { useThemeColor } from "@/lib/use-theme-color";

export function SignInScreen() {
	const insets = useSafeAreaInsets();
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
			else router.push({ pathname: "/verify-code", params: { email: email.trim() } });
		} catch {
			setError(getAuthErrorMessage(null));
		} finally {
			setSending(false);
		}
	}

	return (
		<KeyboardAvoidingView
			className="flex-1 bg-background"
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<ScrollView
				contentContainerClassName="grow px-6"
				contentContainerStyle={{ paddingTop: insets.top + 22, paddingBottom: insets.bottom + 12 }}
				keyboardShouldPersistTaps="handled"
			>
				<View className="flex-row items-center gap-2">
					<QuipuLogo size={30} />
					<Text className="text-2xl font-semibold text-foreground">Quipu</Text>
				</View>

				<View className="flex-1 justify-center py-8">
					<Text className="text-4xl leading-10 font-semibold text-foreground">Entrar a Quipu</Text>
				</View>

				<Text className="text-[13px] font-semibold text-muted-foreground">Correo</Text>
				<TextInput
					className={`min-h-11 border-b py-2 text-base text-foreground ${error ? "border-warning" : "border-input"}`}
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
					<Text accessibilityRole="alert" className="mt-1.5 text-xs text-warning-foreground">
						{error}
					</Text>
				) : null}

				<View className="mt-5">
					<Button label="Enviar código" disabled={sending} onPress={() => void submit()} />
				</View>

				<View className="my-4 flex-row items-center gap-3">
					<View className="h-px flex-1 bg-input" />
					<Text className="text-xs text-muted-foreground">o</Text>
					<View className="h-px flex-1 bg-input" />
				</View>

				<Pressable
					accessibilityRole="button"
					// Luego: diálogo del sistema (passkey) al conectar Convex.
					className="flex-row items-center justify-center gap-2 rounded-full border border-input px-4 py-3.5"
				>
					<Fingerprint size={18} color={foreground} />
					<Text className="text-[15px] font-semibold text-foreground">
						Entrar con huella o rostro
					</Text>
				</Pressable>
				<Text className="mt-2 text-center text-xs text-muted-foreground">
					Usa el desbloqueo de tu celular.
				</Text>

				<View className="mt-6 flex-row justify-center gap-7">
					<Pressable
						accessibilityRole="link"
						className="min-h-11 justify-center"
						onPress={() => void Linking.openURL("https://quipu-finance.app/terminos")}
					>
						<Text className="text-xs text-muted-foreground">Términos</Text>
					</Pressable>
					<Pressable
						accessibilityRole="link"
						className="min-h-11 justify-center"
						onPress={() => void Linking.openURL("https://quipu-finance.app/privacidad")}
					>
						<Text className="text-xs text-muted-foreground">Privacidad</Text>
					</Pressable>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
