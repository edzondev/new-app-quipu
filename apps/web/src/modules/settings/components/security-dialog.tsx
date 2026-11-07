import { FormSheetHeader, FormSheetPanel, FormSheetTitle } from "#/components/form-sheet";
import { useLimaDate } from "#/hooks/use-lima-date";
import { ActionDialog } from "./action-dialog";
import { PasskeysSection } from "./passkeys-section";
import { SessionsSection } from "./sessions-section";

function Security() {
	const today = useLimaDate();
	return (
		<>
			<FormSheetHeader>
				<FormSheetTitle>Llaves y sesiones</FormSheetTitle>
			</FormSheetHeader>
			<FormSheetPanel>
				<PasskeysSection today={today} />
				<SessionsSection today={today} />
			</FormSheetPanel>
		</>
	);
}

export function SecurityDialog() {
	return <ActionDialog label="Gestionar">{() => <Security />}</ActionDialog>;
}
