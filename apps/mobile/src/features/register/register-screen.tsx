import { router, useLocalSearchParams } from "expo-router";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { parseDetected } from "@/features/detection/params";
import { SAMPLE_MOVEMENTS } from "@/features/movements/sample";
import { RegisterForm } from "@/features/register/register-form";

function close() {
	router.back();
}

export function RegisterScreen() {
	const params = useLocalSearchParams();
	const detected = parseDetected(params);
	// Later: the row comes from the movements list.
	const editing =
		SAMPLE_MOVEMENTS.rows.find(
			(row) => row.id === params.edit && (row.kind === "expense" || row.kind === "income"),
		) ?? null;

	return (
		<BottomSheet isPresented onDismiss={close}>
			<RegisterForm
				key={`${detected?.cents}-${detected?.merchant}-${editing?.id}`}
				detected={detected}
				editing={editing}
				onClose={close}
			/>
		</BottomSheet>
	);
}
