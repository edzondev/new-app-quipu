import { Text, View } from "react-native";

const DOT = { primary: "bg-primary", warning: "bg-warning" } as const;

export function Notice({
	tone = "primary",
	children,
}: {
	tone?: keyof typeof DOT;
	children: string;
}) {
	return (
		<View className="flex-row items-start gap-2.5 rounded-[18px] bg-muted px-3.5 py-3">
			<View className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[tone]}`} />
			<Text className="min-w-0 flex-1 text-[13px] leading-[19.5px] font-medium text-foreground">
				{children}
			</Text>
		</View>
	);
}
