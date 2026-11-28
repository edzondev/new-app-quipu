import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { wholeSoles } from "@quipu/backend/shared/budget";
import { queryOptions, useQuery, useSuspenseQueries } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Check from "reicon-react-native/icons/Check";
import Plus from "reicon-react-native/icons/Plus";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { LoadBoundary } from "@/components/ui/load-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useEnsureOpen } from "@/features/cycle/use-ensure-open";
import { useLimaDate } from "@/features/cycle/use-lima-date";
import { EmptyPersonal } from "@/features/home/empty-states";
import { amountParts } from "@/features/home/today-spend";
import { useSpace } from "@/features/household/space-context";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { trialStartedText } from "@/features/plus/plus";
import {
	goalNeedsPlus,
	goalPercent,
	missingCents,
	monthsCovered,
	targetMonthLabel,
} from "@/features/savings/savings";
import { type SavingsPanel, SavingsSheet } from "@/features/savings/savings-sheet";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { useThemeColor } from "@/lib/use-theme-color";

function ProgressBar({
	percent,
	height,
	fill,
}: {
	percent: number;
	height: "h-1.5" | "h-[5px]";
	fill: string;
}) {
	return (
		<View className={`${height} overflow-hidden rounded-full bg-border`}>
			<View className={`h-full rounded-full ${fill}`} style={{ width: `${percent}%` }} />
		</View>
	);
}

type Fund = FunctionReturnType<typeof api.goals.fund>;

/** G1, with the web's rules: the bar only for a goal that was set, and «Retirar» only with money in the fund. */
function FundCard({
	fund,
	onContribute,
	onWithdraw,
	onEditGoal,
}: {
	fund: Fund;
	onContribute: () => void;
	onWithdraw: () => void;
	onEditGoal: () => void;
}) {
	const { fundCents, fundGoalCents } = fund;
	const { whole, decimals } = amountParts(fundCents);
	const months = monthsCovered(fundCents, fund.suggestedFundGoalCents);
	const percent = fundGoalCents ? goalPercent(fundCents, fundGoalCents) : null;

	return (
		<View className="mt-3 border-b border-border py-3.5">
			<View className="flex-row items-center justify-between gap-2">
				<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
					Fondo de emergencia
				</Text>
				<Pressable
					accessibilityRole="button"
					hitSlop={8}
					onPress={onEditGoal}
					className="min-h-8 shrink-0 justify-center active:opacity-60"
				>
					<Text className="text-xs text-muted-foreground underline">
						{fundGoalCents ? `Meta: S/ ${wholeSoles(fundGoalCents)}` : "Definir meta"}
					</Text>
				</Pressable>
			</View>
			<View className="mt-1 flex-row items-start">
				<Text className="mt-2 mr-1 text-lg text-muted-foreground">S/</Text>
				<Text className="font-mono text-[44px] leading-none tracking-tight text-foreground">
					{whole}
					<Text className="text-[19px] text-muted-foreground">.{decimals}</Text>
				</Text>
			</View>
			{months === null ? null : (
				<Text className="mt-1.5 text-[13px] text-muted-foreground">
					Cubre {months} de Necesidades
				</Text>
			)}
			{percent === null ? null : (
				<>
					<View className="mt-2.5">
						<ProgressBar percent={percent} height="h-1.5" fill="bg-envelope-savings" />
					</View>
					<Text className="mt-1.5 text-xs text-muted-foreground">
						{percent >= 100 ? "Meta alcanzada" : `${percent} % de tu meta`}
					</Text>
				</>
			)}
			<View className="mt-3 flex-row gap-2">
				{fundCents > 0 ? (
					<View className="flex-1">
						<Button label="Retirar" variant="secondary" onPress={onWithdraw} />
					</View>
				) : null}
				<View className="flex-1">
					<Button label="Aportar" onPress={onContribute} />
				</View>
			</View>
		</View>
	);
}

type Goal = FunctionReturnType<typeof api.goals.list>[number];

const GOAL_COLORS = ["wants", "needs", "savings"] as const;

/** Tapping the card opens «Editar meta» (decided 25 nov); «Aportar» stays while the goal is not reached. */
function GoalCard({
	goal,
	index,
	onContribute,
	onEdit,
}: {
	goal: Goal;
	index: number;
	onContribute: () => void;
	onEdit: () => void;
}) {
	const foreground = useThemeColor("--color-foreground");
	const color = ENVELOPE_DOT[GOAL_COLORS[index % GOAL_COLORS.length]];
	const savings = useThemeColor("--color-envelope-savings");
	const done = goal.savedCents >= goal.targetCents;
	const line = done
		? "Meta alcanzada"
		: `${targetMonthLabel(goal.targetMonth)} · faltan S/ ${wholeSoles(missingCents(goal.savedCents, goal.targetCents))}`;

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`Editar meta ${goal.name}`}
			// TalkBack reads the card as one button, so its «Aportar» is offered as an action of it.
			accessibilityActions={done ? [] : [{ name: "contribute", label: "Aportar" }]}
			onAccessibilityAction={(event) => {
				if (event.nativeEvent.actionName === "contribute") onContribute();
			}}
			onPress={onEdit}
			className="border-b border-border py-3.5 active:opacity-80"
		>
			<View className="flex-row items-center justify-between gap-2">
				<View className="min-w-0 flex-1">
					<View className="flex-row items-center gap-2.5">
						<View className={`size-2 shrink-0 rounded-full ${color}`} />
						<Text
							className="min-w-0 flex-1 text-[15px] font-semibold text-foreground"
							numberOfLines={1}
						>
							{goal.name}
						</Text>
					</View>
					<Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
						{line}
					</Text>
				</View>
				{done ? (
					<View className="shrink-0 flex-row items-center gap-1">
						<Check size={14} color={savings} />
						<Text className="text-[13px] font-semibold text-envelope-savings">Lista</Text>
					</View>
				) : (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`Aportar a ${goal.name}`}
						onPress={onContribute}
						className="min-h-11 shrink-0 flex-row items-center gap-1 active:opacity-60"
					>
						<Plus size={14} color={foreground} />
						<Text className="text-[13px] font-semibold text-foreground">Aportar</Text>
					</Pressable>
				)}
			</View>
			<View className="mt-1 flex-row items-baseline gap-1.5">
				<Text className="font-mono text-lg text-foreground">S/ {wholeSoles(goal.savedCents)}</Text>
				<Text className="text-xs text-muted-foreground">de S/ {wholeSoles(goal.targetCents)}</Text>
			</View>
			<View className="mt-2">
				<ProgressBar
					percent={goalPercent(goal.savedCents, goal.targetCents)}
					height="h-[5px]"
					fill={color}
				/>
			</View>
		</Pressable>
	);
}

function Goals({
	goals,
	onNewGoal,
	onContribute,
	onEdit,
}: {
	goals: Goal[];
	onNewGoal: () => void;
	onContribute: (id: Goal["id"]) => void;
	onEdit: (id: Goal["id"]) => void;
}) {
	return (
		<View className="mt-[22px]">
			<View className="min-h-8 flex-row items-center justify-between">
				<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
					Tus metas
				</Text>
				{goals.length === 0 ? null : (
					<Text className="text-xs text-muted-foreground">Cada una con su propio saldo</Text>
				)}
			</View>
			{goals.length === 0 ? (
				<View className="mt-1.5 rounded-[22px] border-[1.5px] border-dashed border-input px-[18px] pt-[18px] pb-4">
					<Text className="text-[15px] font-semibold text-foreground">Crea tu primera meta</Text>
					<Text className="mt-1 text-[13px] text-muted-foreground">
						Un viaje, una laptop, un curso. Cada meta junta su propio saldo.
					</Text>
					<View className="mt-3 self-start">
						<Button label="Crear meta" onPress={onNewGoal} />
					</View>
				</View>
			) : (
				goals.map((goal, index) => (
					<GoalCard
						key={goal.id}
						goal={goal}
						index={index}
						onContribute={() => onContribute(goal.id)}
						onEdit={() => onEdit(goal.id)}
					/>
				))
			)}
			{goals.length === 0 ? null : (
				<View className="mt-3.5">
					<Button label="Nueva meta" variant="secondary" onPress={onNewGoal} />
				</View>
			)}
		</View>
	);
}

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

export default function SavingsScreen() {
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
