import { isOwnPurchase, type PlusHistory, type PlusStatus } from "@quipu/backend/shared/billing";
import { formatDay, getLimaDate } from "@quipu/backend/shared/dates";
import { runsAtFor } from "@quipu/backend/shared/deletion";

type Space = { partnerName: string | null; plus: { payerIsMe: boolean } };

/** The day the account would be deleted if asked for today: «27 nov». */
export function deletionDate(today: string) {
	return formatDay(getLimaDate(new Date(runsAtFor(today))));
}

/** The lines of L4 that apply to this person. */
export function deletionLines({
	space,
	plusHistory,
	status,
	today,
}: {
	space: Space | null;
	plusHistory: PlusHistory;
	status: PlusStatus;
	today: string;
}) {
	const partner = space?.partnerName ?? null;
	const lines = [
		space ? "Saldrás de Nuestro espacio." : null,
		space && partner ? `Lo que anotaste ahí se queda para ${partner}.` : null,
		space && partner && space.plus.payerIsMe
			? `${partner} perderá Plus el ${deletionDate(today)}.`
			: null,
		plusHistory === "paid"
			? "El registro de tus pagos queda en la plataforma donde pagaste."
			: null,
	].filter((line): line is string => line !== null);

	return { lines, stillPaying: isOwnPurchase(status) };
}
