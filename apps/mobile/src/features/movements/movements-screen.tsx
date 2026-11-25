import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatDay, formatDayHeading } from "@quipu/backend/shared/dates";
import { queryOptions, useSuspenseQueries } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { SectionList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { LoadBoundary } from "@/components/ui/load-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnsureOpen } from "@/features/cycle/use-ensure-open";
import { useLimaDate } from "@/features/cycle/use-lima-date";
import { useSpace } from "@/features/household/space-context";
import { MovementRow } from "@/features/movements/movement-row";
import {
	dayTotalCents,
	FILTERS,
	filterRows,
	groupByDay,
	type Row,
	rowAction,
	signedAmount,
} from "@/features/movements/movement-rows";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";

function open(row: Row, action: "edit" | "plus") {
	router.push(action === "plus" ? "/plus?feature=space" : `/register?edit=${row.id}`);
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

function MovementsList({
	space,
	readOnly,
	today,
}: {
	space: "personal" | "household";
	readOnly: boolean;
	today: string;
}) {
	const insets = useSafeAreaInsets();
	const [filterIndex, setFilterIndex] = useState(0);
	useEnsureOpen(space, today);
	const [{ data: list }, { data: goals }, { data: household }] = useSuspenseQueries({
		queries: [
			queryOptions(convexQuery(api.transactions.list, { space, today })),
			queryOptions(convexQuery(api.goals.list, { space })),
			// An aporte is changed with the household's Plus, so its rows need it.
			queryOptions(convexQuery(api.household.get, {})),
		],
	});
	const filter = FILTERS[filterIndex];

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
					{filter === "Todos" && !readOnly ? (
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
				const action = rowAction(item, { space, readOnly, household });
				return (
					<MovementRow
						row={item}
						goalName={goals.find((goal) => goal.id === item.goalId)?.name ?? null}
						onPress={action ? () => open(item, action) : undefined}
					/>
				);
			}}
		/>
	);
}

export function MovementsScreen() {
	const insets = useSafeAreaInsets();
	const { space, readOnly } = useSpace();
	const today = useLimaDate();

	return (
		<View className="flex-1 bg-background px-6" style={{ paddingTop: insets.top + 22 }}>
			<Text className="text-3xl font-semibold text-foreground">Movimientos</Text>
			<LoadBoundary message="No pudimos cargar tus movimientos." fallback={<MovementsSkeleton />}>
				<MovementsList space={space} readOnly={readOnly} today={today} />
			</LoadBoundary>
		</View>
	);
}
