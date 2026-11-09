import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

/** W-U7: shows for 3 seconds, then takes `?joined` out of the address. */
export function JoinedNotice({ partnerName }: { partnerName: string }) {
	const navigate = useNavigate({ from: "/home" });
	useEffect(() => {
		const id = setTimeout(() => {
			void navigate({ search: (prev) => ({ ...prev, joined: undefined }), replace: true });
		}, 3000);
		return () => clearTimeout(id);
	}, [navigate]);

	return (
		<p role="status" className="mb-4 rounded-2xl bg-muted px-4 py-3 text-sm">
			Ya estás en Nuestro espacio con {partnerName}.
		</p>
	);
}
