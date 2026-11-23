import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import AngleRight from "reicon-react-native/icons/AngleRight";
import { useThemeColor } from "@/lib/use-theme-color";

export function ListRow({
	label,
	sub,
	value,
	right,
	onPress,
	warning = false,
}: {
	label: string;
	sub?: string;
	value?: string;
	right?: ReactNode;
	onPress?: () => void;
	warning?: boolean;
}) {
	const muted = useThemeColor("--color-muted-foreground");
	const className = "min-h-14 flex-row items-center gap-3 border-b border-border";
	const body = (
		<>
			<View className="min-w-0 flex-1 py-3">
				<Text
					numberOfLines={1}
					className={`text-[15px] font-medium ${warning ? "text-warning-foreground" : "text-foreground"}`}
				>
					{label}
				</Text>
				{sub ? <Text className="text-[12.5px] text-muted-foreground">{sub}</Text> : null}
			</View>
			{value ? (
				<Text numberOfLines={1} className="max-w-[55%] shrink text-[13px] text-muted-foreground">
					{value}
				</Text>
			) : null}
			{right}
			{onPress && !right ? <AngleRight size={16} color={muted} /> : null}
		</>
	);

	return onPress ? (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			className={`${className} active:opacity-60`}
		>
			{body}
		</Pressable>
	) : (
		<View className={className}>{body}</View>
	);
}
