import * as Haptics from "expo-haptics";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AngleLeft from "reicon-react-native/icons/AngleLeft";
import { getAuthErrorMessage } from "@quipu/backend/shared/auth-errors";
import { KeyboardAvoidingView } from "@/components/ui/keyboard-avoiding-view";
import { useToast } from "@/components/ui/toast";
import { useResendClock } from "@/features/auth/use-resend-clock";
import { CODE_LENGTH, formatClock, otpDigits, RESEND_SECONDS } from "@/features/auth/validation";
import { authClient, sendSignInCode } from "@/lib/auth-client";
import { useThemeColor } from "@/lib/use-theme-color";

const BOXES = Array.from({ length: CODE_LENGTH }, (_, index) => index);
const OFFLINE_TEXT = "Sin conexión. Revisa tu señal.";
const WRONG_CODE_ERRORS = ["INVALID_OTP", "OTP_EXPIRED", "TOO_MANY_ATTEMPTS"];

export function OtpScreen() {
	const insets = useSafeAreaInsets();
	const { email } = useLocalSearchParams<{ email: string }>();
	const [code, setCode] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [wrong, setWrong] = useState(false);
	const [verifying, setVerifying] = useState(false);
	const [resending, setResending] = useState(false);
	const resend = useResendClock(RESEND_SECONDS);
	const foreground = useThemeColor("--color-foreground");
	const toast = useToast();

	// A good code changes the session and the guard moves to the next screen by itself.
	async function verify(otp: string) {
		setVerifying(true);
		try {
			const { error } = await authClient.signIn.emailOtp({ email, otp });
			if (!error) return;
			setVerifying(false);
			setWrong(true);
			setMessage(getAuthErrorMessage(error));
			// A3 of the design: a warning vibration for a wrong or expired code. No shake, no red.
			if (error.code && WRONG_CODE_ERRORS.includes(error.code)) {
				void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			}
		} catch {
			// The call rejected instead of answering: no server response, almost always no network.
			setVerifying(false);
			setWrong(true);
			toast.show(OFFLINE_TEXT, true);
		}
	}

	function onCodeChange(text: string) {
		const next = otpDigits(text);
		// Android re-emits the same text when the keyboard closes; that must not verify again.
		if (next === code) return;
		setCode(next);
		setWrong(false);
		setMessage(null);
		if (next.length === CODE_LENGTH && !verifying) void verify(next);
	}

	async function resendCode() {
		if (resending) return;
		setResending(true);
		try {
			const { error } = await sendSignInCode(email);
			if (error) {
				setMessage(getAuthErrorMessage(error));
				return;
			}
			setCode("");
			setWrong(false);
			setMessage(null);
			resend.restart();
		} catch {
			toast.show(OFFLINE_TEXT, true);
		} finally {
			setResending(false);
		}
	}

	function otpBoxClass(index: number) {
		if (wrong) return "border-b-2 border-warning";
		return index === code.length ? "border-b-2 border-foreground" : "border-b border-input";
	}

	if (!email) return <Redirect href="/sign-in" />;

	return (
		<KeyboardAvoidingView className="flex-1 bg-background" behavior="padding">
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
								className={`h-[60px] flex-1 items-center justify-center ${otpBoxClass(index)}`}
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
						onChangeText={onCodeChange}
						accessibilityLabel="Código de 6 dígitos"
					/>
				</View>

				{message ? (
					<Text accessibilityRole="alert" className="mt-3 text-[13px] text-warning-foreground">
						{message}
					</Text>
				) : null}

				<Text className="mt-4 text-[13px] text-muted-foreground">Vence en 5 minutos.</Text>

				<View className="flex-row flex-wrap items-center justify-between gap-x-6">
					{wrong || resend.left === 0 ? (
						<Pressable
							accessibilityRole="button"
							accessibilityState={{ disabled: resending }}
							disabled={resending}
							onPress={() => void resendCode()}
							className={`min-h-11 justify-center ${resending ? "opacity-50" : ""}`}
						>
							<Text className="text-[13px] font-semibold text-foreground underline">
								Reenviar código
							</Text>
						</Pressable>
					) : (
						<Text className="min-h-11 py-3 font-mono text-[13px] text-muted-foreground">
							Reenviar en {formatClock(resend.left)}
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
			{toast.view}
		</KeyboardAvoidingView>
	);
}
