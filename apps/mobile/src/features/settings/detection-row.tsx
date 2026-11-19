import { useFocusEffect } from "expo-router";
import { useState } from "react";
import { Switch } from "react-native";
import { ListRow } from "@/components/ui/list-row";
import { useThemeColor } from "@/lib/use-theme-color";
import { isAccessEnabled } from "../../../modules/quipu-detection";

export function DetectionRow({ onOpen }: { onOpen: () => void }) {
	const foreground = useThemeColor("--color-foreground");
	const background = useThemeColor("--color-background");
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
					trackColor={{ true: foreground }}
					thumbColor={background}
					accessibilityLabel="Detección de gastos"
				/>
			}
		/>
	);
}
