import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/segmented";
import { useSpace } from "@/features/household/space-context";

const SPACES = ["personal", "household"] as const;

export function HomeHeader({ name, hasHousehold }: { name: string; hasHousehold: boolean }) {
	const { space, setSpace } = useSpace();

	return (
		<View className="flex-row items-center gap-3">
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Abrir Ajustes"
				onPress={() => router.push("/settings")}
				className="min-w-0 shrink flex-row items-center gap-2.5"
			>
				<Avatar name={name} />
				<Text className="shrink text-[17px] font-semibold text-foreground" numberOfLines={1}>
					{name}
				</Text>
			</Pressable>
			{hasHousehold ? (
				<View className="min-w-0 flex-1">
					<Segmented
						options={["Personal", "Nuestro espacio"]}
						selectedIndex={SPACES.indexOf(space)}
						onChange={(index) => setSpace(SPACES[index])}
					/>
				</View>
			) : null}
		</View>
	);
}
