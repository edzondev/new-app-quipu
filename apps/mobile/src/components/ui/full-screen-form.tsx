import { router } from "expo-router";
import { type ReactNode, type RefObject, useEffect, useEffectEvent, useRef, useState } from "react";
import { BackHandler, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Xmark from "reicon-react-native/icons/Xmark";
import { withUniwind } from "uniwind";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { SheetHeader } from "@/components/ui/sheet-header";
import { useThemeColor } from "@/lib/use-theme-color";

const ScrollView = withUniwind(KeyboardAwareScrollView);

// The footer stands 76 px over the keyboard (a 52 px button, 12 above and below): a focused field stays 12 over it.
const FIELD_CLEARANCE = 88;

function closeOnce(closed: RefObject<boolean>) {
	if (closed.current) return;
	closed.current = true;
	router.back();
}

/**
 * Closes the form's screen once: a second call (a double tap, an answer that comes after closing, its record
 * gone) does nothing. With `shouldClose` it closes by itself, when what it edits is gone.
 */
export function useCloseScreen(shouldClose: boolean) {
	const closed = useRef(false);

	useEffect(() => {
		if (shouldClose) closeOnce(closed);
	}, [shouldClose]);

	return () => closeOnce(closed);
}

/**
 * A long form over the tabs: ✕ and title on top, the fields scroll and `footer` (its «Guardar») rides just
 * over the keyboard. With `changed`, ✕ and Android back ask «¿Descartar cambios?» before `onClose`.
 * A sheet over the form (a picker, a confirmation) goes among `children`.
 */
export function FullScreenForm({
	title,
	sub,
	changed,
	onClose,
	footer,
	children,
}: {
	title: string;
	sub?: string;
	changed: boolean;
	onClose: () => void;
	footer: ReactNode;
	children: ReactNode;
}) {
	const insets = useSafeAreaInsets();
	const foreground = useThemeColor("--color-foreground");
	const [discarding, setDiscarding] = useState(false);

	function requestClose() {
		if (changed) setDiscarding(true);
		else onClose();
	}

	const onBack = useEffectEvent(requestClose);

	// Android back closes the form like ✕. The keyboard and an open sheet take it first, by themselves.
	useEffect(() => {
		const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
			onBack();
			return true;
		});
		return () => subscription.remove();
	}, []);

	return (
		<View className="flex-1 bg-background" style={{ paddingTop: insets.top + 4 }}>
			<View className="min-h-12 flex-row items-center gap-1 px-6">
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Cerrar"
					onPress={requestClose}
					className="-ml-3 size-12 shrink-0 items-center justify-center active:opacity-60 ios:size-11"
				>
					<Xmark size={22} color={foreground} />
				</Pressable>
				<View className="min-w-0 flex-1">
					<Text className="text-2xl font-semibold text-foreground">{title}</Text>
					{sub ? (
						<Text className="mt-1 text-[13px] leading-[19px] text-muted-foreground">{sub}</Text>
					) : null}
				</View>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerClassName="px-6 pt-2 pb-6"
				keyboardShouldPersistTaps="handled"
				bottomOffset={FIELD_CLEARANCE}
			>
				{children}
			</ScrollView>

			{/* Closed, the footer keeps clear of the system bar; open, the keyboard already covers it. */}
			<KeyboardStickyView offset={{ opened: insets.bottom }}>
				<View className="bg-background px-6 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
					{footer}
				</View>
			</KeyboardStickyView>

			{/* Back or the scrim keep editing. */}
			<BottomSheet isPresented={discarding} onDismiss={() => setDiscarding(false)}>
				<SheetHeader title="¿Descartar cambios?" />
				<View className="mt-4 mb-2 gap-2">
					<Button label="Seguir editando" onPress={() => setDiscarding(false)} />
					<Button label="Descartar" variant="warning" onPress={onClose} />
				</View>
			</BottomSheet>
		</View>
	);
}
