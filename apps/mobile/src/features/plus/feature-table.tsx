import type { ComponentType } from "react";
import { Platform, Text, View } from "react-native";
import Bank from "reicon-react-native/icons/Bank";
import ChartBar from "reicon-react-native/icons/ChartBar";
import Check from "reicon-react-native/icons/Check";
import HomeUser from "reicon-react-native/icons/HomeUser";
import Target from "reicon-react-native/icons/Target";
import { useThemeColor } from "@/lib/use-theme-color";
import { PLUS_ROWS, type PlusFeature } from "./features";

const ICONS: Record<PlusFeature, ComponentType<{ size?: number; color?: string }>> = {
	space: HomeUser,
	banks: Bank,
	goals: Target,
	report: ChartBar,
};

/** Gratis against Plus. Without detection on iPhone, the banks row is not there. */
export function FeatureTable({ heading, highlight }: { heading: string; highlight?: PlusFeature }) {
	const muted = useThemeColor("--color-muted-foreground");
	const savings = useThemeColor("--color-envelope-savings");
	const rows = PLUS_ROWS.filter((row) => row.id !== "banks" || Platform.OS === "android");

	return (
		<View>
			<View className="flex-row items-center border-b border-border pb-2">
				<Text className="flex-1 text-xs font-semibold text-muted-foreground">{heading}</Text>
				<Text className="w-14 text-center text-xs font-semibold text-muted-foreground">Gratis</Text>
				<Text className="w-14 text-center text-xs font-semibold text-muted-foreground">Plus</Text>
			</View>
			{rows.map((row) => {
				const Icon = ICONS[row.id];
				return (
					<View
						key={row.id}
						className={`min-h-14 flex-row items-center border-b border-border py-2 ${highlight === row.id ? "-mx-2 rounded-xl bg-muted px-2" : ""}`}
					>
						<View className="mr-3">
							<Icon size={18} color={muted} />
						</View>
						<View className="min-w-0 flex-1">
							<Text className="text-[14.5px] font-semibold text-foreground">{row.title}</Text>
							{row.detail ? (
								<Text className="text-xs text-muted-foreground">{row.detail}</Text>
							) : null}
						</View>
						<Text className="w-14 text-center text-muted-foreground">—</Text>
						<View className="w-14 items-center">
							<Check size={18} color={savings} />
						</View>
					</View>
				);
			})}
		</View>
	);
}
