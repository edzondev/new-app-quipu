import { useEffect, useState } from "react";

/** A one-line message that clears itself after 3 seconds. */
export function useNotice() {
	const [notice, setNotice] = useState<string | null>(null);
	useEffect(() => {
		if (!notice) return;
		const id = setTimeout(() => setNotice(null), 3000);
		return () => clearTimeout(id);
	}, [notice]);
	return [notice, setNotice] as const;
}
