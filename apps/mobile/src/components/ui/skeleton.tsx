import { View } from "react-native";

/** Block that holds the shape of content while it loads. Static on purpose: no shimmer, so reduce motion changes nothing. */
export function Skeleton({ className }: { className: string }) {
	return <View className={`rounded-2xl bg-muted ${className}`} />;
}
