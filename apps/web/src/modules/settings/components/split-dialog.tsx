import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents } from "@quipu/backend/shared/budget";
import { isValidSplit, type Split } from "@quipu/backend/shared/plan";
import { getSplitPreview } from "@quipu/backend/shared/preview";
import { useMutation } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	FormSheetClose,
	FormSheetDescription,
	FormSheetFooter,
	FormSheetHeader,
	FormSheetPanel,
	FormSheetTitle,
} from "#/components/form-sheet";
import { readError } from "#/lib/read-error";
import { SplitFields } from "#/modules/onboarding/components/split-fields";
import { ActionDialog } from "./action-dialog";

type Home = FunctionReturnType<typeof api.balances.getHome>;

const SUM_ERROR = "Los tres sobres tienen que sumar 100%.";

function SplitEditor({ home, onDone }: { home: Home; onDone: () => void }) {
	const [split, setSplit] = useState<Split>(home.split);
	const updateSplit = useConvexMutation(api.settings.updateSplit);
	const save = useMutation({
		mutationFn: () => updateSplit({ space: "personal", split }),
		onSuccess: onDone,
	});
	// The same function the server runs, so what is promised here is what Inicio shows after saving.
	const preview = isValidSplit(split)
		? getSplitPreview({
				envelopes: home,
				reserved: home.reserved,
				split,
				daysLeft: home.daysLeft,
			})
		: null;

	return (
		<form
			noValidate
			className="contents"
			onSubmit={(event) => {
				event.preventDefault();
				if (preview) save.mutate();
			}}
		>
			<FormSheetHeader>
				<FormSheetTitle>Editar reparto</FormSheetTitle>
				<FormSheetDescription>Aplica desde hoy. Lo ya gastado no cambia.</FormSheetDescription>
			</FormSheetHeader>
			<FormSheetPanel>
				<SplitFields
					value={split}
					amounts={preview?.envelopes ?? home}
					onChange={(key, percent) => setSplit((prev) => ({ ...prev, [key]: percent }))}
					error={preview ? undefined : SUM_ERROR}
				/>
				{preview ? (
					<p className="mt-5 text-sm">
						Con este reparto, hoy puedes gastar{" "}
						<span className="font-semibold tabular-nums">S/ {formatCents(preview.dailyCents)}</span>
						.
					</p>
				) : null}
				{save.isError ? (
					<p role="alert" className="mt-3 text-xs text-warning-foreground">
						{readError(save.error)}
					</p>
				) : null}
			</FormSheetPanel>
			<FormSheetFooter variant="bare">
				<FormSheetClose
					render={<Button type="button" variant="outline" size="xl" className="rounded-full" />}
				>
					Cancelar
				</FormSheetClose>
				<Button
					type="submit"
					size="xl"
					className="rounded-full"
					disabled={!preview || save.isPending}
					loading={save.isPending}
				>
					Guardar
				</Button>
			</FormSheetFooter>
		</form>
	);
}

/** Opens the split editor. Used by Ajustes ("Cambiar") and by "Tus sobres" in Inicio ("Editar reparto"). */
export function SplitDialog({ home, label }: { home: Home; label: string }) {
	return (
		<ActionDialog label={label}>
			{(close) => <SplitEditor home={home} onDone={close} />}
		</ActionDialog>
	);
}
