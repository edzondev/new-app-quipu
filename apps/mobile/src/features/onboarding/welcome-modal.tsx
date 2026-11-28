import { type ReactNode, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { QuipuLogo } from "@/components/quipu-logo";
import { Button } from "@/components/ui/button";
import { useThemeColor } from "@/lib/use-theme-color";

function LineIcon({ children }: { children: ReactNode }) {
	const stroke = useThemeColor("--color-foreground");

	return (
		<Svg
			width={20}
			height={20}
			viewBox="0 0 24 24"
			fill="none"
			stroke={stroke}
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			{children}
		</Svg>
	);
}

function EnvelopesIcon() {
	return (
		<LineIcon>
			<Path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
			<Path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
		</LineIcon>
	);
}

function GoalsIcon() {
	return (
		<LineIcon>
			<Circle cx={12} cy={12} r={10} />
			<Circle cx={12} cy={12} r={6} />
			<Circle cx={12} cy={12} r={2} />
		</LineIcon>
	);
}

function DayNumberIcon() {
	return (
		<LineIcon>
			<Circle cx={12} cy={12} r={10} />
			<Path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 18V6" />
		</LineIcon>
	);
}

function BanksIcon() {
	return (
		<LineIcon>
			<Path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l8 5H4z" />
		</LineIcon>
	);
}

const CORDS = [
	{ d: "M-45 50C40-45 65 15 96 66s45 54 68 12S200-16 250 2s110 45 240 0", token: "needs" },
	{ d: "M-45 76C35-17 56 46 80 91s50 57 77 9S204 10 249 26s110 45 240 0", token: "wants" },
	{ d: "M-45 102C27 7 48 71 66 116s49 57 78 11S207 36 252 52s110 45 240 0", token: "savings" },
] as const;

function CordsBand() {
	const colors = {
		needs: useThemeColor("--color-envelope-needs"),
		wants: useThemeColor("--color-envelope-wants"),
		savings: useThemeColor("--color-envelope-savings"),
	};

	return (
		<Svg
			style={StyleSheet.absoluteFill}
			viewBox="0 0 440 128"
			preserveAspectRatio="xMidYMid slice"
			accessibilityElementsHidden
		>
			{CORDS.map(({ d, token }) => (
				<Path
					key={token}
					d={d}
					fill="none"
					stroke={colors[token]}
					strokeWidth={10}
					strokeLinecap="round"
				/>
			))}
			<Ellipse
				cx={108}
				cy={83}
				rx={8}
				ry={10}
				rotation={-28}
				origin="108, 83"
				fill={colors.needs}
			/>
			<Ellipse cx={353} cy={51} rx={8} ry={10} rotation={10} origin="353, 51" fill={colors.wants} />
			<Ellipse cx={352} cy={77} rx={8} ry={10} fill={colors.savings} />
		</Svg>
	);
}

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
	const { height } = useWindowDimensions();

	return (
		<View
			className="mx-4 overflow-hidden rounded-[28px] bg-popover"
			style={{ minHeight: height * 0.7 }}
		>
			<View className="h-[104px] items-center justify-center bg-secondary">
				<CordsBand />
				<View className="size-16 items-center justify-center rounded-full bg-background">
					<QuipuLogo size={44} />
				</View>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Cerrar"
					onPress={onClose}
					className="absolute top-2.5 left-2.5 size-11 items-center justify-center rounded-full border border-border bg-background active:opacity-60"
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
						className="absolute top-2.5 right-2.5 min-h-11 justify-center rounded-full bg-background px-4 active:opacity-60"
					>
						<Text className="text-[13px] font-semibold text-foreground">Atrás</Text>
					</Pressable>
				) : null}
			</View>

			<View className="flex-1 px-6 pt-6 pb-5">
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
						<View className="min-h-6 flex-1" />
						<Button label="Siguiente" onPress={() => setStep(2)} />
					</>
				) : (
					<>
						<View className="self-start rounded-full bg-primary-soft px-2.5 py-1">
							<Text className="text-xs font-semibold text-primary">Plan Gratis</Text>
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
						<View className="min-h-6 flex-1" />
						<View className="gap-2">
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
