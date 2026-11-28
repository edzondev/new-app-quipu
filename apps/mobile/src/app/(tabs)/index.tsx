import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { AMOUNT_KEYS, ENVELOPE_LABELS, formatCents } from "@quipu/backend/shared/budget";
import { daysBetween, formatDay, formatDaysLeft, formatRange } from "@quipu/backend/shared/dates";
import { queryOptions, useMutation, useQuery, useSuspenseQueries } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { LoadBoundary } from "@/components/ui/load-boundary";
import { PressableScale } from "@/components/ui/pressable-scale";
import { SectionLabel } from "@/components/ui/section-label";
import { Segmented } from "@/components/ui/segmented";
import { SheetHeader } from "@/components/ui/sheet-header";
import { useEnsureOpen } from "@/features/cycle/use-ensure-open";
import { useLimaDate } from "@/features/cycle/use-lima-date";
import { EmptyCycle, EmptyPersonal } from "@/features/home/empty-states";
import { HomeLoading, HomeSkeleton } from "@/features/home/home-skeleton";
import { amountParts, freeCents, todaySpendSummary } from "@/features/home/today-spend";
import { SAMPLE_HOUSEHOLD_HOME } from "@/features/household/sample";
import { useSpace } from "@/features/household/space-context";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { WelcomeModal } from "@/features/onboarding/welcome-modal";
import { PlusSheet } from "@/features/plus/plus-sheet";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { enter } from "@/lib/motion";

/** How full an envelope's bar is: what's left of what was assigned, from 0 to 100. */
function envelopeFillPercent(leftCents: number, assignedCents: number) {
	if (assignedCents <= 0) return 0;
	return Math.min(100, Math.max(0, (leftCents / assignedCents) * 100));
}

type Home = FunctionReturnType<typeof api.balances.getHome>;

const ORDER = ["needs", "wants", "savings"] as const;

function Envelopes({ home }: { home: Home }) {
	return (
		<View>
			<SectionLabel>Sobres</SectionLabel>
			{ORDER.map((envelope) => {
				const key = AMOUNT_KEYS[envelope];
				const cents = home[key];
				const fill = envelopeFillPercent(cents, home.assigned[key]);
				return (
					<View key={envelope} className="border-b border-border py-3">
						<View className="flex-row items-baseline justify-between gap-2.5">
							<View className="min-w-0 flex-1 flex-row items-center gap-2.5">
								<View className={`size-2 shrink-0 rounded-full ${ENVELOPE_DOT[envelope]}`} />
								<Text
									className="shrink text-[15px] font-semibold text-foreground"
									numberOfLines={1}
								>
									{ENVELOPE_LABELS[envelope]}
								</Text>
							</View>
							<Text className="shrink-0 font-mono text-[15px] text-foreground">
								S/ {formatCents(Math.max(0, cents))}
							</Text>
						</View>
						<View className="mt-[9px] flex-row items-center gap-3">
							<View className="h-[5px] flex-1 overflow-hidden rounded-full bg-muted">
								<View
									className={`h-full rounded-full ${ENVELOPE_DOT[envelope]}`}
									style={{ width: `${fill}%` }}
								/>
							</View>
							<Text className="w-[122px] text-right text-xs text-muted-foreground">
								{envelope === "savings" ? "Apartado" : ""}
							</Text>
						</View>
					</View>
				);
			})}
		</View>
	);
}

const SIZES = {
	lg: {
		currency: "mt-2.5 text-2xl",
		number: "text-[80px]",
		decimals: "mt-2 text-[36px]",
	},
	md: {
		currency: "mt-1.5 text-xl",
		number: "text-[56px]",
		decimals: "mt-1.5 text-[26px]",
	},
} as const;

function DayNumber({
	whole,
	decimals,
	over = false,
	size = "lg",
}: {
	whole: string;
	decimals: string;
	over?: boolean;
	size?: keyof typeof SIZES;
}) {
	const classes = SIZES[size];

	return (
		<View
			accessible
			accessibilityLabel={`S/ ${whole}.${decimals}`}
			className="flex-row items-start gap-1"
		>
			<Text className={`font-mono text-muted-foreground ${classes.currency}`}>S/</Text>
			<Text
				className={`font-mono leading-none tracking-tight ${classes.number} ${over ? "text-warning-foreground" : "text-foreground"}`}
			>
				{whole}
			</Text>
			<Text
				className={`font-mono leading-none tracking-tight text-muted-foreground ${classes.decimals}`}
			>
				.{decimals}
			</Text>
		</View>
	);
}

type CommitmentList = FunctionReturnType<typeof api.commitments.list>;
type Item = CommitmentList["items"][number];

function isDueSoon(item: Item) {
	return item.status === "upcoming" || item.status === "overdue";
}

function dueLabel(dueDate: string, today: string) {
	const days = daysBetween(today, dueDate);
	if (days < 0) return days === -1 ? "Venció ayer" : `Venció hace ${-days} días`;
	if (days === 0) return "Vence hoy";
	if (days === 1) return "Vence mañana";
	return `Vence en ${days} días`;
}

function DueSoon({ items, today }: { items: Item[]; today: string }) {
	const dueSoon = items.filter(isDueSoon);
	if (dueSoon.length === 0) return null;

	return (
		<View className="mt-[18px]">
			<SectionLabel>Por pagar</SectionLabel>
			{dueSoon.map((item, index) => (
				<View
					key={item.id}
					className={`min-h-14 flex-row items-center justify-between gap-3 py-3 ${index < dueSoon.length - 1 ? "border-b border-border" : ""}`}
				>
					<View className="min-w-0 flex-1">
						<Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
							{item.name}
						</Text>
						<Text className="mt-0.5 text-[12.5px] text-muted-foreground">
							{dueLabel(item.dueDate, today)}
						</Text>
					</View>
					<Text className="shrink-0 font-mono text-[15px] text-foreground">
						S/ {formatCents(item.amountCents)}
					</Text>
				</View>
			))}
		</View>
	);
}

function Line({
	label,
	value,
	strong = false,
}: {
	label: string;
	value: string;
	strong?: boolean;
}) {
	return (
		<View
			className={`flex-row items-baseline justify-between gap-3 py-2 ${strong ? "border-t border-border" : ""}`}
		>
			<Text
				className={`min-w-0 flex-1 text-[15px] ${strong ? "font-semibold text-foreground" : "text-muted-foreground"}`}
			>
				{label}
			</Text>
			<Text className="shrink-0 font-mono text-[15px] text-foreground">{value}</Text>
		</View>
	);
}

/** C6: the day number is the free money divided by the days left, counting today. */
function FormulaSheet({
	home,
	isPresented,
	onDismiss,
}: {
	home: Home;
	isPresented: boolean;
	onDismiss: () => void;
}) {
	return (
		<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
			<SheetHeader title="Cómo se calcula" />
			<Text className="mt-1 text-sm leading-5 text-muted-foreground">
				Lo libre, dividido entre los días que faltan para el cierre.
			</Text>
			<View className="mt-4">
				<Line label="Libre en Necesidades + Gustos" value={`S/ ${formatCents(freeCents(home))}`} />
				<Line
					label={`÷ días hasta el cierre (${formatDay(home.endDate)})`}
					value={String(home.daysLeft)}
				/>
				<Line label="= puedes gastar hoy" value={`S/ ${formatCents(home.dailyCents)}`} strong />
			</View>
			<Text className="mt-3 text-[13px] leading-[19px] text-muted-foreground">
				Lo libre ya no incluye tus compromisos por pagar ni tu ahorro.
			</Text>
			<View className="mt-5">
				<Button label="Entendido" onPress={onDismiss} />
			</View>
		</BottomSheet>
	);
}

function PersonalHome({
	home,
	items,
	today,
}: {
	home: Home;
	items: CommitmentList["items"];
	today: string;
}) {
	const [formulaOpen, setFormulaOpen] = useState(false);

	if (home.empty)
		return (
			<EmptyCycle
				startDate={home.startDate}
				endDate={home.endDate}
				planIncomeCents={home.planIncomeCents}
			/>
		);

	const hero = todaySpendSummary(home);
	const daysLeft = formatDaysLeft(home.daysLeft);
	const daysLeftLabel = `${daysLeft.charAt(0).toUpperCase()}${daysLeft.slice(1)}`;
	const subtitle = hero.daily ? `Sin comprometer tu ciclo. ${daysLeftLabel}.` : daysLeftLabel;

	return (
		<>
			<View className="mt-[22px] flex-row items-center gap-2">
				<SectionLabel>{hero.label}</SectionLabel>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Cómo se calcula"
					hitSlop={12}
					onPress={() => setFormulaOpen(true)}
					className="size-6 items-center justify-center rounded-full border-[1.5px] border-input active:opacity-60"
				>
					<Text className="text-xs font-bold text-muted-foreground">i</Text>
				</Pressable>
			</View>
			<View className="mt-2">
				<DayNumber whole={hero.whole} decimals={hero.decimals} over={hero.over} />
			</View>
			<Text className="mt-2.5 text-[13px] text-muted-foreground">{subtitle}</Text>

			<View className="mt-[22px]">
				<Envelopes home={home} />
			</View>

			<DueSoon items={items} today={today} />

			<FormulaSheet home={home} isPresented={formulaOpen} onDismiss={() => setFormulaOpen(false)} />
		</>
	);
}

function ReadOnlyHome() {
	const home = SAMPLE_HOUSEHOLD_HOME;
	const { whole, decimals } = amountParts(home.dailyCents);
	const daysLeft = formatDaysLeft(home.daysLeft);

	return (
		<View>
			<PressableScale
				scale={0.985}
				accessibilityRole="button"
				onPress={() => router.push({ pathname: "/plan", params: { status: "lapsed" } })}
				className="min-h-11 justify-center rounded-2xl border border-warning px-4 py-2.5"
			>
				<Text className="text-[13px] font-semibold text-warning-foreground">
					Solo lectura · Activa Plus para seguir anotando
				</Text>
			</PressableScale>

			<View className="mt-[22px]">
				<SectionLabel>Pueden gastar hoy juntos</SectionLabel>
			</View>
			<View className="mt-2">
				<DayNumber whole={whole} decimals={decimals} />
			</View>
			<Text className="mt-2.5 text-[13px] text-muted-foreground">
				{`${daysLeft.charAt(0).toUpperCase()}${daysLeft.slice(1)} · ciclo ${formatRange(home.startDate, home.endDate)}.`}
			</Text>

			<View className="mt-[22px]">
				<Envelopes home={home} />
			</View>
		</View>
	);
}

const SPACES = ["personal", "household"] as const;

function HomeHeader({ name, hasHousehold }: { name: string; hasHousehold: boolean }) {
	const { space, setSpace } = useSpace();

	return (
		<View className="min-h-12 flex-row items-center justify-between gap-3">
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Abrir Ajustes"
				onPress={() => router.push("/settings")}
				className="max-w-[35%] min-w-0 shrink flex-row items-center gap-2.5 active:opacity-60"
			>
				<Avatar name={name} />
				<Text className="shrink text-[15px] font-semibold text-foreground" numberOfLines={1}>
					{name}
				</Text>
			</Pressable>
			{hasHousehold ? (
				<View className="min-w-0 shrink">
					<Segmented
						size="sm"
						options={["Personal", "Nuestro espacio"]}
						selectedIndex={SPACES.indexOf(space)}
						onChange={(index) => setSpace(SPACES[index])}
					/>
				</View>
			) : null}
		</View>
	);
}

/** Inicio's personal content. Its data lives here, so a failure remounts only this part. */
function PersonalBody({ today }: { today: string }) {
	useEnsureOpen("personal", today);
	const [{ data: home }, { data: commitments }] = useSuspenseQueries({
		queries: [
			queryOptions(convexQuery(api.balances.getHome, { space: "personal", today })),
			queryOptions(convexQuery(api.commitments.list, { space: "personal", today })),
		],
	});

	// The skeleton leaves at once: fading it out would keep both in the layout for a moment.
	return (
		<Animated.View entering={enter}>
			<PersonalHome home={home} items={commitments.items} today={today} />
		</Animated.View>
	);
}

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const { space } = useSpace();
	const today = useLimaDate();
	const { data: profile } = useQuery(convexQuery(api.profiles.myProfile, {}));
	const markWelcomeSeen = useMutation({
		mutationFn: useConvexMutation(api.profiles.markWelcomeSeen),
	});
	const [plansOpen, setPlansOpen] = useState(false);
	const closeWelcome = () => markWelcomeSeen.mutate({});

	if (!profile) return <HomeLoading />;

	return (
		<View className="flex-1 bg-background">
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-6"
				contentContainerStyle={{
					paddingTop: insets.top + 12,
					paddingBottom: insets.bottom + TAB_BAR_SPACE,
				}}
			>
				<HomeHeader name={profile.name} hasHousehold={profile.hasHousehold} />

				{space === "household" ? (
					<View className="mt-6">
						<ReadOnlyHome />
					</View>
				) : !profile.plan ? (
					<EmptyPersonal />
				) : (
					<LoadBoundary message="No pudimos cargar tu inicio." fallback={<HomeSkeleton />}>
						<PersonalBody today={today} />
					</LoadBoundary>
				)}

				{/* TEMPORAL: enlace de prueba; se quita al conectar el informe del ciclo. */}
				<Pressable
					accessibilityRole="link"
					className="mt-6 min-h-11 justify-center active:opacity-60"
					onPress={() => router.push("/report")}
				>
					<Text className="text-[13px] text-muted-foreground underline">
						Probar: Informe del ciclo
					</Text>
				</Pressable>
			</ScrollView>

			<WelcomeModal
				visible={!profile.welcomeSeen}
				name={profile.name}
				onClose={closeWelcome}
				onSeePlus={() => {
					closeWelcome();
					setPlansOpen(true);
				}}
			/>
			<PlusSheet isPresented={plansOpen} onDismiss={() => setPlansOpen(false)} />
		</View>
	);
}
