import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { NAME_MAX_LENGTH, nameSchema } from "@quipu/backend/shared/budget";
import { formatDay, getLimaDate } from "@quipu/backend/shared/dates";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
	FormSheetClose,
	FormSheetDescription,
	FormSheetFooter,
	FormSheetHeader,
	FormSheetPanel,
	FormSheetTitle,
} from "#/components/form-sheet";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { useEnsureOpenCycle } from "#/hooks/use-ensure-open-cycle";
import { useLimaDate } from "#/hooks/use-lima-date";
import { readError } from "#/lib/read-error";
import { ACTION } from "#/lib/typography";
import { ActionDialog } from "#/modules/settings/components/action-dialog";
import { CycleDialog } from "#/modules/settings/components/cycle-dialog";
import { SettingsGroup, SettingsRow } from "#/modules/settings/components/settings-row";
import { SplitDialog } from "#/modules/settings/components/split-dialog";
import { getCycleLines } from "#/modules/settings/cycle-summary";
import { DownloadHistoryButton } from "./download-history-button";

const DEFAULT_NAME = "Nuestro espacio";

function RenameEditor({ name, onDone }: { name: string; onDone: () => void }) {
	const [value, setValue] = useState(name);
	const rename = useConvexMutation(api.household.rename);
	const save = useMutation({ mutationFn: () => rename({ name: value }), onSuccess: onDone });
	const tooLong = value.trim().length > NAME_MAX_LENGTH;
	const valid = nameSchema.safeParse(value).success;

	return (
		<form
			noValidate
			className="contents"
			onSubmit={(event) => {
				event.preventDefault();
				if (valid) save.mutate();
			}}
		>
			<FormSheetHeader>
				<FormSheetTitle>Nombre</FormSheetTitle>
				<FormSheetDescription>Los dos pueden cambiarlo.</FormSheetDescription>
			</FormSheetHeader>
			<FormSheetPanel>
				<Input
					aria-label="Nombre del espacio"
					value={value}
					onChange={(event) => setValue(event.target.value)}
				/>
				{tooLong ? (
					<p role="alert" className="mt-3 text-xs text-warning-foreground">
						El nombre tiene máximo {NAME_MAX_LENGTH} caracteres.
					</p>
				) : null}
				{save.isError ? (
					<p role="alert" className="wrap-break-word mt-3 text-xs text-warning-foreground">
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
					disabled={!valid}
					loading={save.isPending}
				>
					Guardar
				</Button>
			</FormSheetFooter>
		</form>
	);
}

/** P18b: says what happens before leaving. The history and the fund stay with the other person. */
function LeaveEditor({ partnerName, onDone }: { partnerName: string; onDone: () => void }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const leave = useConvexMutation(api.household.leaveHousehold);
	const save = useMutation({
		mutationFn: () => leave({}),
		onSuccess: async () => {
			onDone();
			await queryClient.invalidateQueries();
			await navigate({ to: "/home", search: { space: undefined, left: true } });
		},
	});

	return (
		<>
			<FormSheetHeader>
				<FormSheetTitle>¿Salir de Nuestro espacio?</FormSheetTitle>
				<FormSheetDescription className="wrap-break-word">
					Dejarás de verlo. El historial y el fondo se quedan con {partnerName}. Quipu no mueve
					dinero: lo del fondo acuérdenlo entre ustedes.
				</FormSheetDescription>
			</FormSheetHeader>
			{save.isError ? (
				<FormSheetPanel>
					<p role="alert" className="wrap-break-word text-xs text-warning-foreground">
						{readError(save.error)}
					</p>
				</FormSheetPanel>
			) : null}
			<FormSheetFooter variant="bare">
				<DownloadHistoryButton label="Descargar mi historial" size="xl" className="rounded-full" />
				<Button
					size="xl"
					className="rounded-full"
					loading={save.isPending}
					onClick={() => save.mutate()}
				>
					Salir
				</Button>
				<FormSheetClose
					render={<Button type="button" variant="outline" size="xl" className="rounded-full" />}
				>
					Cancelar
				</FormSheetClose>
			</FormSheetFooter>
		</>
	);
}

export function SpaceSettings() {
	const today = useLimaDate();
	// Remount when the Lima day flips so the open cycle is read again.
	return <Space key={today} today={today} />;
}

function Space({ today }: { today: string }) {
	const queryClient = useQueryClient();
	const household = useQuery(convexQuery(api.household.get, {}));
	const ensureOpen = useEnsureOpenCycle("household", today);
	const home = useQuery(
		convexQuery(
			api.balances.getHome,
			ensureOpen.isSuccess ? { space: "household", today } : "skip",
		),
	);

	if (household.isError || ensureOpen.isError || home.isError) {
		return (
			<div role="alert" className="pt-6">
				<p className="text-sm text-warning-foreground">No pudimos cargar Nuestro espacio.</p>
				<Button
					variant="outline"
					size="xl"
					className="mt-3"
					onClick={() => {
						void queryClient.invalidateQueries();
					}}
				>
					Reintentar
				</Button>
			</div>
		);
	}
	if (!household.data || !home.data) {
		return (
			<div role="status" className="space-y-6 pt-6" aria-busy="true" aria-label="Cargando">
				<Skeleton className="h-10 w-40" />
				<Skeleton className="h-20" />
				<Skeleton className="h-20" />
			</div>
		);
	}

	const { name, partnerName, partnerJoinedAt, cycle } = household.data;
	const { split } = home.data;

	return (
		<div className="max-w-2xl">
			<header>
				<h1 className="wrap-break-word font-heading text-[34px] leading-[1.1] font-normal tracking-[-0.01em]">
					{name ?? DEFAULT_NAME}
				</h1>
			</header>

			<SettingsGroup title="Nuestro espacio">
				<SettingsRow
					title="Nombre"
					action={
						<ActionDialog label="Cambiar" gated>
							{(close) => <RenameEditor name={name ?? DEFAULT_NAME} onDone={close} />}
						</ActionDialog>
					}
				>
					<p className="wrap-break-word">{name ?? DEFAULT_NAME}</p>
				</SettingsRow>
				<SettingsRow title="Tú" action={null} />
				<SettingsRow title={partnerName ?? "Tu pareja"} action={null}>
					<p>
						{partnerName === null
							? "Aún no entra"
							: partnerJoinedAt === null
								? null
								: `Se unió el ${formatDay(getLimaDate(new Date(partnerJoinedAt)))}`}
					</p>
				</SettingsRow>
			</SettingsGroup>

			<SettingsGroup title="Ciclo del espacio">
				<SettingsRow
					title="Ciclo"
					action={
						<CycleDialog
							space="household"
							plan={cycle}
							nextPlan={null}
							currentEnd={home.data.endDate}
						/>
					}
				>
					{getCycleLines({ plan: cycle, nextPlan: null, currentEnd: home.data.endDate }).map(
						(line) => (
							<p key={line}>{line}</p>
						),
					)}
				</SettingsRow>
				<SettingsRow
					title="Reparto"
					action={<SplitDialog home={home.data} space="household" label="Cambiar" />}
				>
					<p>
						Necesidades {split.needs}% · Gustos {split.wants}% · Ahorro {split.savings}%
					</p>
				</SettingsRow>
			</SettingsGroup>

			<div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2">
				<Link to="/settings" className={ACTION}>
					Volver a Ajustes
				</Link>
				{partnerName === null ? null : (
					<ActionDialog label="Salir del espacio">
						{(close) => <LeaveEditor partnerName={partnerName} onDone={close} />}
					</ActionDialog>
				)}
			</div>
		</div>
	);
}
