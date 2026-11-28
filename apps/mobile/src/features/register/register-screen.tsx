import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { getLimaDate } from "@quipu/backend/shared/dates";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useCloseScreen } from "@/components/ui/full-screen-form";
import { type DetectedDraft, parseDetected } from "@/features/detection/params";
import { canEdit } from "@/features/movements/movement-rows";
import { RegisterForm } from "@/features/register/register-form";

/**
 * Reads the cache that Inicio and Movimientos already filled, with the same keys: it opens no cycle and
 * waits for nothing. The form shows at once and the numbers fill in. Only an edit needs its row first.
 */
function RegisterBody({
	today,
	editId,
	detected,
}: {
	today: string;
	editId: string | null;
	detected: DetectedDraft | null;
}) {
	const personal: { space: "personal" | "household"; today: string } = { space: "personal", today };
	const { data: home } = useQuery(convexQuery(api.balances.getHome, personal));
	const { data: household } = useQuery(convexQuery(api.household.get, {}));
	const { data: list } = useQuery(convexQuery(api.transactions.list, editId ? personal : "skip"));

	const found = list?.rows.find((row) => row.id === editId && canEdit(row, "personal")) ?? null;
	// Gone (just deleted here, or from another device) or not editable: the screen closes.
	const close = useCloseScreen(editId !== null && list !== undefined && !found);
	// The last row found stays while the screen slides away, so the form does not blank out under it.
	const [lastFound, setLastFound] = useState(found);
	if (found !== null && found !== lastFound) setLastFound(found);
	const editing = found ?? lastFound;
	// The row is still loading: nothing to edit yet.
	if (editId !== null && !editing) return null;

	return (
		<RegisterForm
			key={`${detected?.cents}-${detected?.merchant}-${editing?.id}`}
			home={home}
			household={household}
			today={today}
			detected={detected}
			editing={editing}
			onClose={close}
		/>
	);
}

export function RegisterScreen() {
	const params = useLocalSearchParams();
	const detected = parseDetected(params);
	const editId = typeof params.edit === "string" ? params.edit : null;
	// The day is read once, when the screen opens: a change underneath must not wipe what is typed.
	const [today] = useState(getLimaDate);

	return <RegisterBody today={today} editId={editId} detected={detected} />;
}
