import { api } from "@quipu/backend/convex/_generated/api";
import { getLimaDate } from "@quipu/backend/shared/dates";
import { type HistoryRow, historyCsv, historyFileName } from "@quipu/backend/shared/history";
import { useMutation } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { useRouteContext } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { toastManager } from "#/components/ui/toast";

function useDownloadHistory() {
	const { convexQueryClient } = useRouteContext({ from: "__root__" });
	return useMutation({
		mutationFn: async () => {
			const rows: HistoryRow[] = [];
			let before: string | undefined;
			do {
				const page = await convexQueryClient.convexClient.query(api.history.household, { before });
				rows.push(...page.rows);
				before = page.next ?? undefined;
			} while (before !== undefined);
			const url = URL.createObjectURL(new Blob([historyCsv(rows)], { type: "text/csv" }));
			const link = document.createElement("a");
			link.href = url;
			link.download = historyFileName(getLimaDate());
			link.click();
			// Safari can drop the download if the URL goes away in the same task as the click.
			setTimeout(() => URL.revokeObjectURL(url), 0);
		},
		onError: () => {
			toastManager.add({
				title: "No pudimos descargar el historial. Intenta de nuevo.",
				type: "warning",
			});
		},
	});
}

export function DownloadHistoryButton({
	label,
	...props
}: { label: string } & Pick<ComponentProps<typeof Button>, "className" | "size">) {
	const download = useDownloadHistory();
	return (
		<Button
			{...props}
			variant="outline"
			loading={download.isPending}
			onClick={() => download.mutate()}
		>
			{download.isPending ? "Descargando…" : label}
		</Button>
	);
}
