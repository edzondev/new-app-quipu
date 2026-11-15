import { Text, View } from "react-native";

export function ReadsBlock() {
	return (
		<View className="mt-6 rounded-2xl border border-border px-4 py-3">
			<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
				Qué lee Quipu
			</Text>
			<Text className="mt-2 text-[15px] text-foreground">
				Solo el monto y el comercio de los avisos de tus bancos. Nunca tus claves, ni tus saldos, ni
				el resto de tus notificaciones.
			</Text>
			<Text className="mt-2 text-[15px] text-foreground">
				Lo usamos solo para proponerte gastos e ingresos. No se comparte con nadie.
			</Text>
		</View>
	);
}
