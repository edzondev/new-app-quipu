import { DialogHeader, DialogPanel, DialogTitle } from "#/components/ui/dialog";
import { useLimaDate } from "#/hooks/use-lima-date";
import { ActionDialog } from "./action-dialog";
import { PasskeysSection } from "./passkeys-section";
import { SessionsSection } from "./sessions-section";

function Security() {
	const today = useLimaDate();
	return (
		<>
			<DialogHeader>
				<DialogTitle>Llaves y sesiones</DialogTitle>
			</DialogHeader>
			<DialogPanel>
				<PasskeysSection today={today} />
				<SessionsSection today={today} />
			</DialogPanel>
		</>
	);
}

export function SecurityDialog() {
	return <ActionDialog label="Gestionar">{() => <Security />}</ActionDialog>;
}
