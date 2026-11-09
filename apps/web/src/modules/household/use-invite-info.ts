import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { ConvexHttpClient } from "convex/browser";

// The app's websocket client starts paused (`expectAuth`) and only resumes once there is a session,
// so for someone without an account a live query would wait forever. A plain HTTP call needs no session.
const http = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

/** `inviteInfo` for a 6-character code; `data` stays undefined while loading or with any other length. */
export function useInviteInfo(code: string) {
	return useQuery({
		queryKey: ["inviteInfo", code],
		queryFn: () => http.query(api.household.inviteInfo, { code }),
		enabled: code.length === 6,
	});
}
