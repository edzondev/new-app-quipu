import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Skeleton } from "@/components/ui/skeleton";

/** Inicio's shape while its data loads (P1): quiet blocks, no spinner. */
export function HomeSkeleton() {
	return (
		<View accessibilityLabel="Cargando" accessibilityState={{ busy: true }} className="gap-6 pt-6">
			<Skeleton className="h-3 w-28" />
			<Skeleton className="h-20 w-56" />
			<Skeleton className="h-3 w-64" />
			<View className="gap-3">
				<Skeleton className="h-14" />
				<Skeleton className="h-14" />
				<Skeleton className="h-14" />
			</View>
		</View>
	);
}

/** Full screen while the profile is unknown, so the tabs do not show empty. */
export function HomeLoading() {
	const insets = useSafeAreaInsets();

	return (
		<View className="flex-1 bg-background px-6" style={{ paddingTop: insets.top + 12 }}>
			<HomeSkeleton />
		</View>
	);
}
