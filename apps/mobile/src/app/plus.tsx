import { router, useLocalSearchParams } from "expo-router";
import { PLUS_ROWS } from "@/features/plus/plus";
import { PlusSheet } from "@/features/plus/plus-sheet";

/**
 * The Plus offer as its own screen, for who is sent here from another sheet: that sheet is replaced, so «atrás» does not come back to it.
 * `?feature=` picks the offer (the same ids as the table of plans); anything else shows the plans.
 */
export default function PlusScreen() {
	const { feature } = useLocalSearchParams<{ feature?: string }>();
	const offer = PLUS_ROWS.find((row) => row.id === feature)?.id ?? null;

	return <PlusSheet isPresented feature={offer} onDismiss={() => router.back()} />;
}
