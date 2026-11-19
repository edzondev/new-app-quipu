import { Text } from "react-native";

export function SectionLabel({ children }: { children: string }) {
	return (
		<Text className="text-[11px] font-bold tracking-[1.76px] text-muted-foreground uppercase">
			{children}
		</Text>
	);
}
