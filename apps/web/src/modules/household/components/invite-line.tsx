import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { extractCode } from "@quipu/backend/shared/household";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { inviteState } from "../invite-state";

const INVITE_PATH = "/unirme/";

/** W-U6: above Entrar and Crear cuenta when the redirect leads to a working invite; nothing otherwise. */
export function InviteLine({ redirect, action }: { redirect: string; action: string }) {
	const code = redirect.startsWith(INVITE_PATH) ? extractCode(redirect) : "";
	const [now] = useState(Date.now);
	const { data } = useQuery(
		convexQuery(api.household.inviteInfo, code.length === 6 ? { code } : "skip"),
	);
	if (!data || inviteState(data, now) !== "valid") return null;
	return (
		<p className="mb-5 text-sm text-muted-foreground">
			{action} para unirte al espacio de {data.inviterName}.
		</p>
	);
}
