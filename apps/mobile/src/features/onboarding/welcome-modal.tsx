import { type ReactNode, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { QuipuLogo } from "@/components/quipu-logo";
import { Button } from "@/components/ui/button";
import { useThemeColor } from "@/lib/use-theme-color";
import { CordsBand } from "./cords-band";
import { BanksIcon, DayNumberIcon, EnvelopesIcon, GoalsIcon } from "./welcome-icons";

function Point({ icon, title, detail }: { icon: ReactNode; title: string; detail?: string }) {
	return (
		<View className="flex-row items-start gap-3">
			<View className="mt-px">{icon}</View>
			<View className="min-w-0 flex-1">
				<Text className="text-[14.5px] font-semibold text-foreground">{title}</Text>
				{detail ? <Text className="mt-0.5 text-[13px] text-muted-foreground">{detail}</Text> : null}
			</View>
		</View>
	);
}

function Dots({ step }: { step: 1 | 2 }) {
	return (
		<View
			className="mt-3.5 flex-row justify-center gap-1.5"
			accessibilityRole="progressbar"
			accessibilityLabel={`Paso ${step} de 2`}
		>
			{([1, 2] as const).map((index) => (
				<View
					key={index}
					className={`h-1.5 rounded-full ${index === step ? "w-[22px] bg-primary" : "w-1.5 bg-input"}`}
				/>
			))}
		</View>
	);
}

function Content({
	name,
	onClose,
	onSeePlus,
}: {
	name: string;
	onClose: () => void;
	onSeePlus: () => void;
}) {
	const foreground = useThemeColor("--color-foreground");
	const [step, setStep] = useState<1 | 2>(1);

	return (
		<View className="mx-4 overflow-hidden rounded-[28px] bg-popover">
			<View className="h-[104px] items-center justify-center bg-secondary">
				<CordsBand />
				<View className="size-16 items-center justify-center rounded-full bg-background">
					<QuipuLogo size={44} />
				</View>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Cerrar"
					onPress={onClose}
					className="absolute top-2.5 left-2.5 size-11 items-center justify-center rounded-full border border-border bg-background"
				>
					<Svg
						width={20}
						height={20}
						viewBox="0 0 24 24"
						fill="none"
						stroke={foreground}
						strokeWidth={1.6}
						strokeLinecap="round"
					>
						<Path d="M18 6 6 18M6 6l12 12" />
					</Svg>
				</Pressable>
				{step === 2 ? (
					<Pressable
						accessibilityRole="button"
						onPress={() => setStep(1)}
						className="absolute top-2.5 right-2.5 min-h-11 justify-center rounded-full bg-background px-4"
					>
						<Text className="text-[13px] font-semibold text-foreground">Atrás</Text>
					</Pressable>
				) : null}
			</View>

			<View className="px-6 pt-6 pb-5">
				{step === 1 ? (
					<>
						<Text className="text-3xl leading-9 font-semibold text-foreground">Hola, {name}</Text>
						<Text className="mt-2.5 text-sm text-muted-foreground">
							Quipu reparte tu sueldo y calcula cuánto puedes gastar hasta tu próximo pago.
						</Text>
						<View className="mt-5 gap-4">
							<Point
								icon={<EnvelopesIcon />}
								title="Tu dinero en sobres."
								detail="Necesidades, Gustos y Ahorro."
							/>
							<Point
								icon={<GoalsIcon />}
								title="Tus metas de ahorro."
								detail="Ahorra para lo que quieres."
							/>
							<Point
								icon={<DayNumberIcon />}
								title="Tu número del día en Inicio."
								detail="Mira cuánto puedes gastar hoy."
							/>
						</View>
						<View className="mt-6">
							<Button label="Siguiente" onPress={() => setStep(2)} />
						</View>
					</>
				) : (
					<>
						<View className="self-start rounded-full bg-muted px-2.5 py-1">
							<Text className="text-xs font-semibold text-muted-foreground">Plan Gratis</Text>
						</View>
						<Text className="mt-3 text-3xl leading-9 font-semibold text-foreground">
							Tu plan es Gratis
						</Text>
						<Text className="mt-2 text-sm text-muted-foreground">Todo lo esencial, sin pagar.</Text>
						<View className="mt-5 gap-4">
							<Point icon={<GoalsIcon />} title="2 metas" detail="El fondo no cuenta." />
							<Point icon={<BanksIcon />} title="2 bancos" />
						</View>
						<Text className="mt-5 text-[13px] text-muted-foreground">
							<Text className="font-semibold text-foreground">
								Plus suma Nuestro espacio, más metas, más bancos en Android y Progreso completo.
							</Text>{" "}
							Pruébalo gratis 14 días cuando lo necesites.
						</Text>
						<View className="mt-6 gap-2">
							<Button label="Empezar" onPress={onClose} />
							<Button label="Ver Plus" variant="secondary" onPress={onSeePlus} />
						</View>
					</>
				)}
				<Dots step={step} />
			</View>
		</View>
	);
}

export function WelcomeModal({
	visible,
	name,
	onClose,
	onSeePlus,
}: {
	visible: boolean;
	name: string;
	onClose: () => void;
	onSeePlus: () => void;
}) {
	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View className="flex-1 justify-center bg-black/50">
				<Content name={name} onClose={onClose} onSeePlus={onSeePlus} />
			</View>
		</Modal>
	);
}
