import { useFocusEffect } from "expo-router";
import { useState } from "react";
import { Switch } from "react-native";
import { ListRow } from "@/components/ui/list-row";
import { useThemeColor } from "@/lib/use-theme-color";
import { isAccessEnabled } from "../../../modules/quipu-detection";

export function DetectionRow({ onOpen }: { onOpen: () => void }) {
	const primary = useThemeColor("--color-primary");
	const [access, setAccess] = useState(false);

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
