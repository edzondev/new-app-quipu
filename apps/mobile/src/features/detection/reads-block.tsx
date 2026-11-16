import { Text, View } from "react-native";

export function ReadsBlock() {
	return (
		<View className="mt-6 rounded-2xl border border-border px-4 py-3">
			<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
				Qué lee Quipu
			</Text>
			<Text className="mt-2 text-[15px] text-foreground">
				Quipu lee el texto de los avisos de los bancos que elijas, en tu teléfono, solo para sacar
				el monto y el comercio. No guarda ese texto ni lo envía a ningún lado.
			</Text>
			<Text className="mt-2 text-[15px] text-foreground">
				Lo usamos solo para proponerte gastos e ingresos. No se comparte con nadie.
			</Text>
		</View>
	);
}

export function RestrictedSettingsNote() {
	return (
		<Text className="mt-4 text-[13px] text-muted-foreground">
			Si instalaste Quipu por un enlace, Android puede bloquear este permiso. En la ficha de la app,
			abre el menú ⋮ y toca «Permitir ajustes restringidos».
		</Text>
	);
}
