/** A short message at the bottom. The caller clears it (see `useNotice`). */
export function Toast({ message }: { message: string | null }) {
	if (!message) return null;
	return (
		<p
			role="status"
			className="fixed bottom-6 left-1/2 z-50 max-w-[calc(100vw-48px)] -translate-x-1/2 rounded-full bg-foreground px-5 py-3 text-center text-sm text-background shadow-lg wrap-break-word"
		>
			{message}
		</p>
	);
}
