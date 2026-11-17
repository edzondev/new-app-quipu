import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOAST_MS = 3000;

type Toast = { text: string; warning: boolean };

function ToastView({ text, warning }: Toast) {
	const insets = useSafeAreaInsets();

	return (
		<View
			pointerEvents="none"
			className="absolute right-6 left-6 items-center"
			style={{ top: insets.top + 8 }}
		>
			<View
				accessibilityRole="alert"
				accessibilityLiveRegion="polite"
				className={`rounded-full px-4 py-3 ${warning ? "border border-warning bg-popover" : "bg-foreground"}`}
			>
				<Text
					className={`text-center text-[13px] font-semibold ${warning ? "text-warning-foreground" : "text-background"}`}
				>
					{text}
				</Text>
			</View>
		</View>
	);
}

/** One message at a time, gone after 3 s. Render `view` last in the screen so it sits on top. */
export function useToast() {
	const [toast, setToast] = useState<Toast | null>(null);

	useEffect(() => {
		if (!toast) return;
		const timer = setTimeout(() => setToast(null), TOAST_MS);
		return () => clearTimeout(timer);
	}, [toast]);

	return {
		show: (text: string, warning = false) => setToast({ text, warning }),
		view: toast ? <ToastView {...toast} /> : null,
	};
}
