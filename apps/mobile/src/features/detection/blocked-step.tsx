import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { ReadsBlock } from "@/features/detection/reads-block";

const STEPS = [
	"Android te muestra una lista.",
	"Busca Quipu y actívalo.",
	"Si Android avisa, es un mensaje genérico. Quipu solo lee los bancos que elegiste.",
];

export function BlockedStep({
	onOpenSettings,
	onManual,
}: {
	onOpenSettings: () => void;
	onManual: () => void;
}) {
	return (
		<View>
			<Text className="text-2xl font-semibold text-foreground">
				Quipu no puede leer los avisos de tu banco
			</Text>
			<View className="mt-5 gap-3">
				{STEPS.map((step, index) => (
					<View key={step} className="flex-row gap-3">
						<Text className="font-mono text-[13px] text-muted-foreground">0{index + 1}</Text>
						<Text className="flex-1 text-[15px] text-foreground">{step}</Text>
					</View>
				))}
			</View>
			<ReadsBlock />
			<View className="mt-6 gap-3">
				<Button label="Abrir Ajustes del teléfono" onPress={onOpenSettings} />
				<Button label="Seguir registrando a mano" variant="secondary" onPress={onManual} />
			</View>
		</View>
	);
}
