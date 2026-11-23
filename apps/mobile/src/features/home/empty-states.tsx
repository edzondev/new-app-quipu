import { formatCents } from "@quipu/backend/shared/budget";
import { formatRange } from "@quipu/backend/shared/dates";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
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

/** C2: the cycle exists but has no money yet. */
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
			<Text className="mt-2 text-3xl leading-9 font-semibold text-foreground">
				Aún no registras dinero en este ciclo.
			</Text>
			<Text className="mt-3 text-sm text-muted-foreground">
				Registra con cuánto cuentas y Quipu lo reparte en tus sobres.
			</Text>
			{planIncomeCents === null ? (
				<View className="mt-6">
					<Button label="Registrar ingreso" onPress={() => router.push("/register?kind=income")} />
				</View>
			) : (
				<>
					<Text className="mt-6 text-sm text-muted-foreground">
						¿Ya te pagaron{" "}
						<Text className="font-mono font-semibold text-foreground">
							S/ {formatCents(planIncomeCents)}
						</Text>
						?
					</Text>
					<View className="mt-3">
						<Button
							label="Sí, ya me pagaron"
							onPress={() => router.push(`/register?kind=income&cents=${planIncomeCents}`)}
						/>
					</View>
					<Pressable
						accessibilityRole="button"
						onPress={() => router.push("/register?kind=income")}
						className="mt-1 min-h-11 items-center justify-center active:opacity-60"
					>
						<Text className="text-[13.5px] font-medium text-muted-foreground underline">
							Registrar otro monto
						</Text>
					</Pressable>
				</>
			)}
		</View>
	);
}
