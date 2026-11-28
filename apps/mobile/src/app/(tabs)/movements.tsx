import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatDay, formatDayHeading } from "@quipu/backend/shared/dates";
import { queryOptions, useQuery, useSuspenseQueries } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, SectionList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { LoadBoundary } from "@/components/ui/load-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnsureOpen } from "@/features/cycle/use-ensure-open";
import { useLimaDate } from "@/features/cycle/use-lima-date";
import { EmptyPersonal } from "@/features/home/empty-states";
import { useSpace } from "@/features/household/space-context";
import {
	dayTotalCents,
	filterRows,
	FILTERS,
	groupByDay,
	movementText,
	type Row,
	rowAction,
	signedAmount,
	type Tone,
} from "@/features/movements/movement-rows";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { EditSavingSheet } from "@/features/savings/savings-sheet";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";

const TONE_TEXT = {
	default: "text-foreground",
	savings: "text-envelope-savings",
} as const satisfies Record<Tone, string>;

const ROW = "flex-row items-center justify-between gap-2.5 border-b border-border py-3";

/** Tappable only with `onPress`: a row the person cannot change stays a plain view. */
function MovementRow({
	row,
	goalName,
	onPress,
}: {
	row: Row;
	goalName: string | null;
	onPress?: () => void;
}) {
	const { name, detail, amount, tone } = movementText(row, goalName);
	const content = (
		<>
			<View className="min-w-0 flex-1 flex-row items-center gap-2.5">
				<View
					className={`size-2 shrink-0 rounded-full ${row.envelope ? ENVELOPE_DOT[row.envelope] : "bg-muted-foreground"}`}
				/>
				<View className="min-w-0 flex-1">
					<Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
						{name}
					</Text>
					<Text className="mt-0.5 text-[13px] text-muted-foreground" numberOfLines={1}>
						{detail}
					</Text>
				</View>
			</View>
			<Text className={`shrink-0 font-mono text-[15px] ${TONE_TEXT[tone]}`}>{amount}</Text>
		</>
	);

	if (!onPress) return <View className={ROW}>{content}</View>;
	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			className={`${ROW} min-h-11 active:opacity-60`}
		>
			{content}
		</Pressable>
	);
}

function MovementsSkeleton() {
	return (
		<View
			accessibilityLabel="Cargando"
			accessibilityState={{ busy: true }}
			className="gap-3.5 pt-3.5"
		>
			<Skeleton className="h-4 w-40 self-center" />
			<Skeleton className="h-11 w-64" />
			<Skeleton className="h-14" />
			<Skeleton className="h-14" />
			<Skeleton className="h-14" />
		</View>
	);
}

function MovementsList({ space, today }: { space: "personal" | "household"; today: string }) {
	const insets = useSafeAreaInsets();
	const [filterIndex, setFilterIndex] = useState(0);
	const [editingId, setEditingId] = useState<Row["id"] | null>(null);
	useEnsureOpen(space, today);
	const [{ data: list }, { data: goals }, { data: household }, { data: fund }, { data: home }] =
		useSuspenseQueries({
			queries: [
				queryOptions(convexQuery(api.transactions.list, { space, today })),
				queryOptions(convexQuery(api.goals.list, { space })),
				// An aporte is changed with the household's Plus, so its rows need it.
				queryOptions(convexQuery(api.household.get, {})),
				// Editing an ahorro or a retiro needs the fund and the Ahorro: the sheet opens filled.
				queryOptions(convexQuery(api.goals.fund, { space, today })),
				queryOptions(convexQuery(api.balances.getHome, { space, today })),
			],
		});
	const filter = FILTERS[filterIndex];
	// The sheet looks its row up in the live list: gone (deleted elsewhere), it closes.
	const editing = list.rows.find((row) => row.id === editingId) ?? null;

	function open(row: Row, action: "edit" | "editSaving" | "plus") {
		if (action === "editSaving") setEditingId(row.id);
		else router.push(action === "plus" ? "/plus?feature=space" : `/register?edit=${row.id}`);
	}

	// Registrar writes to Personal only, so the list offers it only there.
	const canRegister = space === "personal";

	const header = (
		<View>
			<Text className="mt-3.5 text-center font-mono text-[15px] text-foreground">
				{formatDay(list.startDate)} – {formatDay(list.endDate)}
			</Text>
			<View className="mt-3.5">
				<Chips options={FILTERS} selectedIndex={filterIndex} onChange={setFilterIndex} />
			</View>
		</View>
	);

	return (
		<>
			<SectionList
				className="flex-1"
				contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_SPACE }}
				sections={groupByDay(filterRows(list.rows, filter))}
				keyExtractor={(row) => row.id}
				stickySectionHeadersEnabled={false}
				ListHeaderComponent={header}
				ListEmptyComponent={
					<View>
						<Text className="mt-[22px] text-sm text-muted-foreground">
							Aún no hay {filter === "Todos" ? "movimientos" : filter.toLowerCase()} en este ciclo.
						</Text>
						{filter === "Todos" && canRegister ? (
							<View className="mt-4">
								<Button label="Registrar gasto" onPress={() => router.push("/register")} />
							</View>
						) : null}
					</View>
				}
				renderSectionHeader={({ section }) => (
					<View className="mt-[22px] flex-row items-baseline justify-between gap-2.5">
						<Text className="shrink text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
							{formatDayHeading(section.title, today)}
						</Text>
						<Text className="shrink-0 font-mono text-[13px] text-muted-foreground">
							{signedAmount(dayTotalCents(section.data))}
						</Text>
					</View>
				)}
				renderItem={({ item }) => {
					const action = rowAction(item, { space, household });
					return (
						<MovementRow
							row={item}
							goalName={goals.find((goal) => goal.id === item.goalId)?.name ?? null}
							onPress={action ? () => open(item, action) : undefined}
						/>
					);
				}}
			/>
			<BottomSheet isPresented={editing !== null} onDismiss={() => setEditingId(null)}>
				{editing ? (
					<EditSavingSheet
						key={editing.id}
						space={space}
						row={editing}
						fund={fund}
						goals={goals}
						savingsCents={home.savingsCents}
						// An answer that comes after this sheet closed must not close the next one.
						onDone={() => setEditingId((current) => (current === editing.id ? null : current))}
					/>
				) : null}
			</BottomSheet>
		</>
	);
}

export default function MovementsScreen() {
	const insets = useSafeAreaInsets();
	const { space } = useSpace();
	const today = useLimaDate();
	const { data: profile } = useQuery(convexQuery(api.profiles.myProfile, {}));

	return (
		<View className="flex-1 bg-background px-6" style={{ paddingTop: insets.top + 22 }}>
			<Text className="text-3xl font-semibold text-foreground">Movimientos</Text>
			{/* Without a personal plan its cycle cannot open: Primeros pasos first, like Inicio. */}
			{space === "personal" && profile && !profile.plan ? (
				<EmptyPersonal />
			) : (
				<LoadBoundary message="No pudimos cargar tus movimientos." fallback={<MovementsSkeleton />}>
					{/* A new space or day remounts the list: an open sheet never writes to the wrong one. */}
					<MovementsList key={`${space}-${today}`} space={space} today={today} />
				</LoadBoundary>
			)}
		</View>
	);
}
