import { Text } from "react-native";

export function SectionLabel({ children }: { children: string }) {
	return (
		<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
			{children}
		</Text>
	);
}
