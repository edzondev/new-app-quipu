import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { NumberedLines } from "@/features/detection/numbered-lines";
import { ReadsBlock } from "@/features/detection/reads-block";

const LINES = [
	"Cuando tu banco te avisa de un gasto, Quipu lo prepara por ti.",
	"Solo lee las apps que tú elijas. Nada más.",
	"Nada se guarda sin que lo confirmes.",
];

export function ConsentStep({ onAccept, onSkip }: { onAccept: () => void; onSkip: () => void }) {
	return (
		<View>
			<Text className="text-2xl font-semibold text-foreground">
				Anota tus gastos sin escribirlos
			</Text>
			<NumberedLines lines={LINES} />
			<ReadsBlock />
			<Text className="mt-4 text-[13px] text-muted-foreground">
				Si instalaste Quipu por un enlace, Android puede bloquear este permiso. En la ficha de la
				app, abre el menú ⋮ y toca «Permitir ajustes restringidos».
			</Text>
			<View className="mt-6 gap-3">
				<Button label="Aceptar e ir a Ajustes" onPress={onAccept} />
				<Button label="Ahora no" variant="secondary" onPress={onSkip} />
			</View>
		</View>
	);
}
