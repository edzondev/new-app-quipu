import { useFocusEffect } from "expo-router";
import { useState } from "react";
import { Switch } from "react-native";
import { ListRow } from "@/components/ui/list-row";
import { useThemeColor } from "@/lib/use-theme-color";
import { isAccessEnabled } from "../../../modules/quipu-detection";

/** The switch shows if Android lets Quipu read the notices. Turning it on or off happens in M9. */
export function DetectionRow({ onOpen }: { onOpen: () => void }) {
	const primary = useThemeColor("--color-primary");
	const [access, setAccess] = useState(false);

	// M9 sends the person to Android's settings; on coming back the answer may have changed.
	useFocusEffect(() => {
		setAccess(isAccessEnabled());
	});

	return (
		<ListRow
			label="Detección de gastos"
			sub={access ? "Activa en tu teléfono" : undefined}
			onPress={onOpen}
			right={
				<Switch
					value={access}
					onValueChange={onOpen}
					trackColor={{ true: primary }}
					accessibilityLabel="Detección de gastos"
				/>
			}
		/>
	);
}
