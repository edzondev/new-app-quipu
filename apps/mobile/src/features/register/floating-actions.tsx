import { Button, Host, RNHostView } from "@expo/ui";
import { router } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Plus from "reicon-react-native/icons/Plus";

/** Clears the native tab bar; mic will sit next to this later. */
const FAB_BOTTOM_OFFSET = 72;

export function FloatingActions() {
	const insets = useSafeAreaInsets();

	return (
		<View
			pointerEvents="box-none"
			style={{
				position: "absolute",
				right: 16,
				bottom: insets.bottom + FAB_BOTTOM_OFFSET,
			}}
		>
			<Host matchContents>
				<Button onPress={() => router.push("/register")}>
					<RNHostView matchContents>
						<Plus size={22} color="#1D1610" />
					</RNHostView>
				</Button>
			</Host>
		</View>
	);
}
