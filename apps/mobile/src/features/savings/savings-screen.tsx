import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { wholeSoles } from "@quipu/backend/shared/budget";
import { queryOptions, useQuery, useSuspenseQueries } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { LoadBoundary } from "@/components/ui/load-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useEnsureOpen } from "@/features/cycle/use-ensure-open";
import { useLimaDate } from "@/features/cycle/use-lima-date";
import { EmptyPersonal } from "@/features/home/empty-states";
import { useSpace } from "@/features/household/space-context";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { trialStartedText } from "@/features/plus/trial";
import { FundCard } from "./fund-card";
import { goalNeedsPlus } from "./goal-form";
import { Goals } from "./goals";
import { type SavingsPanel, SavingsSheet } from "./savings-sheet";

type Space = "personal" | "household";

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<View className="flex-1">
			<Text className="text-xs text-muted-foreground">{label}</Text>
			<Text className="mt-0.5 font-mono text-sm text-foreground">{value}</Text>
		</View>
	);
}

function SavingsSkeleton() {
	return (
		<View
			accessibilityLabel="Cargando"
			accessibilityState={{ busy: true }}
			className="gap-3.5 pt-3.5"
		>
			<Skeleton className="h-9" />
			<Skeleton className="h-44" />
			<Skeleton className="h-24" />
		</View>
	);
}

function SavingsBody({
	space,
	today,
	hasPlus,
	onTrial,
}: {
	space: Space;
	today: string;
	hasPlus: boolean | undefined;
	onTrial: (endsAt: number) => void;
}) {
	const insets = useSafeAreaInsets();
	const [panel, setPanel] = useState<SavingsPanel | null>(null);
	useEnsureOpen(space, today);
	const [{ data: fund }, { data: goals }, { data: home }, { data: household }] = useSuspenseQueries(
		{
			queries: [
				queryOptions(convexQuery(api.goals.fund, { space, today })),
				queryOptions(convexQuery(api.goals.list, { space })),
				// The same Ahorro as getBalances (cycle.envelopes), already cached by Inicio and Registrar.
				queryOptions(convexQuery(api.balances.getHome, { space, today })),
				// Without Plus, Nuestro espacio is read-only: every write opens the offer instead, like the web.
				queryOptions(convexQuery(api.household.get, {})),
			],
		},
	);
	const readOnly = space === "household" && household?.plus.active === false;
	// The sheet looks its goal up in the live list: gone (deleted elsewhere), it has nothing to show.
	const goalId = panel && "goalId" in panel ? panel.goalId : null;
	const goal = goalId === null ? null : (goals.find((item) => item.id === goalId) ?? null);
	// While it slides away the sheet shows nothing: a goal that is gone must not turn into the fund or a new goal.
	const shown = panel && (goalId === null || goal !== null) ? panel : null;
	const savedCents = goals.reduce((sum, item) => sum + item.savedCents, fund.fundCents);

	function open(next: SavingsPanel) {
		if (readOnly) router.push("/plus?feature=space");
		else setPanel(next);
	}

	function newGoal() {
		// goalNeedsPlus is never true in Nuestro espacio, so the read-only offer still comes from open().
		if (goalNeedsPlus({ space, goalCount: goals.length, hasPlus })) setPanel({ kind: "plus" });
		else open({ kind: "goal", goalId: null });
	}

	return (
		<>
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_SPACE }}
			>
				<View className="mt-3 flex-row gap-2.5">
					<Stat
						label="Planeado este ciclo"
						value={`S/ ${wholeSoles(home.assigned.savingsCents)} · S/ ${wholeSoles(home.savingsCents)} apartados`}
					/>
					<Stat label="Ya guardado · Fondo + metas" value={`S/ ${wholeSoles(savedCents)}`} />
				</View>
				<FundCard
					fund={fund}
					onContribute={() => open({ kind: "contribute", goalId: null })}
					onWithdraw={() => open({ kind: "withdraw" })}
					onEditGoal={() => open({ kind: "fundGoal" })}
				/>
				<Goals
					goals={goals}
					onNewGoal={newGoal}
					onContribute={(id) => open({ kind: "contribute", goalId: id })}
					onEdit={(id) => open({ kind: "goal", goalId: id })}
				/>
			</ScrollView>
			<BottomSheet isPresented={shown !== null} onDismiss={() => setPanel(null)}>
				{shown ? (
					<SavingsSheet
						key={`${shown.kind}-${goalId}`}
						space={space}
						today={today}
						panel={shown}
						goal={goal}
						fund={fund}
						savingsCents={home.savingsCents}
						// An answer that comes after this sheet closed must not close the next one.
						onDone={() => setPanel((current) => (current === shown ? null : current))}
						onTrial={onTrial}
					/>
				) : null}
			</BottomSheet>
		</>
	);
}

export function SavingsScreen() {
	const insets = useSafeAreaInsets();
	const { space } = useSpace();
	const today = useLimaDate();
	const { data: profile } = useQuery(convexQuery(api.profiles.myProfile, {}));
	const toast = useToast();

	return (
		<View className="flex-1 bg-background">
			<View className="flex-1 px-6" style={{ paddingTop: insets.top + 22 }}>
				<Text className="text-3xl font-semibold text-foreground">Ahorros</Text>
				<Text className="mt-1 text-[13px] text-muted-foreground">
					Lo que separas hoy cuida tu mes de mañana.
				</Text>
				{/* Without a personal plan its cycle cannot open: Primeros pasos first, like Inicio. */}
				{space === "personal" && profile && !profile.plan ? (
					<EmptyPersonal />
				) : (
					<LoadBoundary message="No pudimos cargar tus ahorros." fallback={<SavingsSkeleton />}>
						{/* A new space or day remounts the body: an open sheet never writes to the wrong one. */}
						<SavingsBody
							key={`${space}-${today}`}
							space={space}
							today={today}
							hasPlus={profile?.hasPlus}
							onTrial={(endsAt) => toast.show(trialStartedText(endsAt))}
						/>
					</LoadBoundary>
				)}
			</View>
			{toast.view}
		</View>
	);
}
