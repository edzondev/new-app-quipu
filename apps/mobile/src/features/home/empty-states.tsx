import { wholeSoles } from "@quipu/backend/shared/budget";
import { formatRange } from "@quipu/backend/shared/dates";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";

/** J8: someone who joined Nuestro espacio without Primeros pasos has no Personal yet. */
export function EmptyPersonal() {
	return (
		<View className="mt-6">
			<Text className="text-3xl leading-9 font-semibold text-foreground">
				Arma tu plan personal cuando quieras
			</Text>
			<View className="mt-6">
				<Button label="Armar mi plan" onPress={() => router.push("/onboarding")} />
			</View>
		</View>
	);
}

/** C2 and C2b: the cycle exists but has no money yet. With the usual pay known, one tap asks «¿Ya te pagaron?». */
export function EmptyCycle({
	startDate,
	endDate,
	planIncomeCents,
}: {
	startDate: string;
	endDate: string;
	planIncomeCents: number | null;
}) {
	return (
		<View className="mt-6">
			<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
				Ciclo {formatRange(startDate, endDate)}
			</Text>
			{planIncomeCents === null ? (
				<>
					<Text className="mt-2 text-3xl leading-9 font-semibold text-foreground">
						Aún no registras dinero en este ciclo.
					</Text>
					<Text className="mt-3 text-sm text-muted-foreground">
						Registra con cuánto cuentas y Quipu lo reparte en tus sobres.
					</Text>
					<View className="mt-6">
						<Button
							label="Registrar ingreso"
							onPress={() => router.push("/register?kind=income")}
						/>
					</View>
				</>
			) : (
				<>
					<Text className="mt-2 text-3xl leading-9 font-semibold text-foreground">
						¿Ya te pagaron?
					</Text>
					<Text className="mt-3 text-sm text-muted-foreground">Lo que te pagan normalmente</Text>
					<Text className="mt-1 font-mono text-[40px] leading-[48px] text-foreground">
						S/ {wholeSoles(planIncomeCents)}
					</Text>
					<Text className="mt-3 text-[13px] text-muted-foreground">
						¿Fue otro monto? Cámbialo antes de guardar.
					</Text>
					<View className="mt-6">
						<Button
							label="Sí, ya me pagaron"
							onPress={() => router.push(`/register?kind=income&cents=${planIncomeCents}`)}
						/>
					</View>
				</>
			)}
		</View>
	);
}
