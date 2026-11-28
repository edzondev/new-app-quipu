import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";

/** An amber line under a field or a button: the backend's message or a check that failed. */
export function WarningText({ children }: { children: string | null }) {
	if (!children) return null;
	return (
		<Text accessibilityRole="alert" className="mt-3 text-[13px] text-warning-foreground">
			{children}
		</Text>
	);
}

/** The web's confirmation, in the same sheet like D4: one sheet never opens another on top. */
export function ConfirmView({
	title,
	body,
	confirmLabel,
	cancelLabel,
	pending,
	error,
	onConfirm,
	onCancel,
}: {
	title: string;
	body: string | null;
	confirmLabel: string;
	cancelLabel: string;
	pending: boolean;
	error: string | null;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	return (
		<View>
			<Text className="text-[28px] leading-8 font-semibold text-foreground">{title}</Text>
			{body ? <Text className="mt-2 text-sm leading-5 text-muted-foreground">{body}</Text> : null}
			<WarningText>{error}</WarningText>
			<View className="mt-6 mb-2 gap-2">
				<Button label={confirmLabel} variant="warning" loading={pending} onPress={onConfirm} />
				<Button label={cancelLabel} variant="secondary" disabled={pending} onPress={onCancel} />
			</View>
		</View>
	);
}
