import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { wholeSoles } from "@quipu/backend/shared/budget";
import { groupCommitments } from "@quipu/backend/shared/commitments";
import { queryOptions, useQuery, useSuspenseQueries } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { type ReactNode, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Plus from "reicon-react-native/icons/Plus";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ExpandChevron } from "@/components/ui/expand-chevron";
import { LoadBoundary } from "@/components/ui/load-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { PaidSheet } from "@/features/commitments/paid-sheet";
import { CommitmentRow, RowLink } from "@/features/commitments/commitment-row";
import { CommitmentSheet } from "@/features/commitments/commitment-sheet";
import {
	backToRuleLabel,
	dueLine,
	paidBeforeLine,
	payLabel,
	paymentFrequency,
} from "@/features/commitments/commitment-text";
import { PaySheet } from "@/features/commitments/pay-sheet";
import { useCommitmentActions } from "@/features/commitments/use-commitment-actions";
import { useEnsureOpen } from "@/features/cycle/use-ensure-open";
import { useLimaDate } from "@/features/cycle/use-lima-date";
import { EmptyPersonal } from "@/features/home/empty-states";
import { useSpace } from "@/features/household/space-context";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { enter, exit } from "@/lib/motion";
import { useThemeColor } from "@/lib/use-theme-color";

type Space = "personal" | "household";
type Item = FunctionReturnType<typeof api.commitments.list>["items"][number];
type Sheet = { kind: "new" } | { kind: "edit" | "pay"; id: Item["id"] } | null;

function Eyebrow({ children }: { children: ReactNode }) {
	return (
		<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
			{children}
		</Text>
	);
}

function CommitmentsSkeleton() {
	return (
		<View
			accessibilityLabel="Cargando"
			accessibilityState={{ busy: true }}
			className="gap-3.5 pt-3.5"
		>
			<Skeleton className="h-4 w-56" />
			<Skeleton className="h-10 w-40" />
			<Skeleton className="h-14" />
			<Skeleton className="h-14" />
			<Skeleton className="h-14" />
		</View>
	);
}

/** "Volver al 28": takes this month's change back. Its own actions, so its error stays under its row. */
function BackToRule({
	space,
	item,
	label,
	readOnly,
}: {
	space: Space;
	item: Item;
	label: string;
	readOnly: boolean;
}) {
	const actions = useCommitmentActions(space);
	return (
		<>
			<RowLink
				label={label}
				disabled={actions.pending}
				onPress={() => {
					if (readOnly) router.push("/plus?feature=space");
					else void actions.run({ kind: "clearDue", id: item.id });
				}}
			/>
			{actions.error ? (
				<Text accessibilityRole="alert" className="text-[13px] text-warning-foreground">
					{actions.error}
				</Text>
			) : null}
		</>
	);
}

function CommitmentsList({ space, today }: { space: Space; today: string }) {
	const insets = useSafeAreaInsets();
	const foreground = useThemeColor("--color-foreground");
	const [paidBeforeOpen, setPaidBeforeOpen] = useState(false);
	const [sheet, setSheet] = useState<Sheet>(null);
	useEnsureOpen(space, today);
	const [{ data: list }, { data: household }] = useSuspenseQueries({
		queries: [
			queryOptions(convexQuery(api.commitments.list, { space, today })),
			// Without Plus, Nuestro espacio is read-only: every write opens the offer instead, like the web.
			queryOptions(convexQuery(api.household.get, {})),
		],
	});
	const { items, payments, payableCents, paidCents } = list;
	const readOnly = space === "household" && household?.plus.active === false;
	// The sheet looks its commitment up in the live list: gone (deleted elsewhere), it has nothing to show.
	const target = sheet && sheet.kind !== "new" ? items.find((item) => item.id === sheet.id) : null;
	const close = () => setSheet(null);

	function open(next: NonNullable<Sheet>) {
		if (readOnly) router.push("/plus?feature=space");
		else setSheet(next);
	}

	const renderItem = (item: Item, line: string) => {
		const pay = payLabel(item);
		const backTo = backToRuleLabel(item);
		return (
			<CommitmentRow
				key={item.id}
				name={item.name}
				amountCents={item.amountCents}
				line={line}
				status={item.status}
				onPress={() => open({ kind: "edit", id: item.id })}
				pay={pay ? { label: pay, onPress: () => open({ kind: "pay", id: item.id }) } : null}
				below={
					backTo ? (
						<BackToRule space={space} item={item} label={backTo} readOnly={readOnly} />
					) : null
				}
			/>
		);
	};

	let content: ReactNode;
	if (items.length === 0 && payments.length === 0) {
		content = (
			<View
				className="flex-1 justify-center"
				style={{ paddingBottom: insets.bottom + TAB_BAR_SPACE }}
			>
				<Text className="text-[26px] leading-tight font-semibold text-foreground">
					Sin compromisos.
				</Text>
				<Text className="mt-2.5 text-sm text-muted-foreground">
					Añade tus pagos fijos y Quipu los reserva por ti.
				</Text>
				<View className="mt-4 self-start">
					<Button label="Añadir compromiso" onPress={() => open({ kind: "new" })} />
				</View>
			</View>
		);
	} else {
		const groups = groupCommitments(items);
		content = (
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_SPACE }}
			>
				<Text className="mt-1 text-[13px] text-muted-foreground">
					Reservados antes de que gastes un sol.
				</Text>
				<View className="mt-[22px] flex-row items-center justify-between gap-2.5">
					<Eyebrow>Por pagar este ciclo</Eyebrow>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Añadir compromiso"
						onPress={() => open({ kind: "new" })}
						className="size-11 shrink-0 items-center justify-center rounded-full bg-secondary active:opacity-60"
					>
						<Plus size={18} color={foreground} />
					</Pressable>
				</View>
				<View className="flex-row flex-wrap items-baseline gap-x-1.5">
					<Text className="font-mono text-[34px] tracking-tight text-foreground">
						S/ {wholeSoles(payableCents)}
					</Text>
					<Text className="text-[13px] text-muted-foreground">
						· S/ {wholeSoles(paidCents)} ya pagado
					</Text>
				</View>
				{groups.pending.map((item) => renderItem(item, dueLine(item, item.status, today)))}
				{payments.map((payment) => (
					<CommitmentRow
						key={payment.paymentId}
						name={payment.name}
						amountCents={payment.amountCents}
						line={dueLine(
							{ ...payment, frequency: paymentFrequency(payment, items) },
							"paid",
							today,
						)}
						status="paid"
					/>
				))}
				{groups.later.length > 0 ? (
					<View className="mt-[22px]">
						<Eyebrow>Más adelante</Eyebrow>
						{groups.later.map((item) => renderItem(item, dueLine(item, "later", today)))}
					</View>
				) : null}
				{groups.paidBefore.length > 0 ? (
					<View className="mt-3.5">
						<Pressable
							accessibilityRole="button"
							accessibilityState={{ expanded: paidBeforeOpen }}
							onPress={() => setPaidBeforeOpen(!paidBeforeOpen)}
							className="min-h-11 flex-row items-center justify-between gap-2.5 active:opacity-60"
						>
							<Eyebrow>Pagados antes</Eyebrow>
							<ExpandChevron open={paidBeforeOpen} />
						</Pressable>
						{paidBeforeOpen ? (
							<Animated.View entering={enter} exiting={exit}>
								{groups.paidBefore.map(
									(item) => item.status === "paid" && renderItem(item, paidBeforeLine(item, today)),
								)}
							</Animated.View>
						) : null}
					</View>
				) : null}
			</ScrollView>
		);
	}

	return (
		<>
			{content}
			<BottomSheet isPresented={sheet?.kind === "new" || Boolean(target)} onDismiss={close}>
				{sheet?.kind === "new" ? (
					<CommitmentSheet space={space} item={null} today={today} onDone={close} />
				) : target && sheet?.kind === "pay" ? (
					<PaySheet space={space} item={target} today={today} onDone={close} />
				) : target?.status === "paid" ? (
					<PaidSheet space={space} item={target} today={today} onDone={close} />
				) : target ? (
					<CommitmentSheet space={space} item={target} today={today} onDone={close} />
				) : null}
			</BottomSheet>
		</>
	);
}

export function CommitmentsScreen() {
	const insets = useSafeAreaInsets();
	const { space } = useSpace();
	const today = useLimaDate();
	const { data: profile } = useQuery(convexQuery(api.profiles.myProfile, {}));

	return (
		<View className="flex-1 bg-background px-6" style={{ paddingTop: insets.top + 22 }}>
			<Text className="text-3xl font-semibold text-foreground">Compromisos</Text>
			{/* Without a personal plan its cycle cannot open: Primeros pasos first, like Inicio. */}
			{space === "personal" && profile && !profile.plan ? (
				<EmptyPersonal />
			) : (
				<LoadBoundary
					message="No pudimos cargar tus compromisos."
					fallback={<CommitmentsSkeleton />}
				>
					{/* A new space or day remounts the list: an open sheet never writes to the wrong one. */}
					<CommitmentsList key={`${space}-${today}`} space={space} today={today} />
				</LoadBoundary>
			)}
		</View>
	);
}
