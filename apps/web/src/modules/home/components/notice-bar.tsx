import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "#/components/ui/button";
import { readError } from "#/lib/read-error";

/** A notice at the top of Inicio that stays until it is dismissed with ✕. */
export function NoticeBar({
	children,
	onDismiss,
	pending,
	error,
}: {
	children: ReactNode;
	onDismiss: () => void;
	pending: boolean;
	error: unknown;
}) {
	return (
		<div
			role="status"
			className="mb-6 flex items-start justify-between gap-3 rounded-2xl bg-muted py-1 pr-1 pl-4 text-sm"
		>
			<div className="min-w-0 py-2.5">
				{children}
				{error ? (
					<p role="alert" className="mt-1.5 text-xs text-warning-foreground">
						{readError(error)}
					</p>
				) : null}
			</div>
			<Button
				variant="ghost"
				size="icon"
				aria-label="Cerrar aviso"
				className="size-11 shrink-0 sm:size-11"
				disabled={pending}
				onClick={onDismiss}
			>
				<X strokeWidth={1.5} />
			</Button>
		</div>
	);
}
