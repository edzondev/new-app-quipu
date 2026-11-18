import type { api } from "@quipu/backend/convex/_generated/api";
import { formatDaysLeft } from "@quipu/backend/shared/dates";
import type { FunctionReturnType } from "convex/server";
import { Text, View } from "react-native";
import { DayNumber } from "@/features/home/day-number";
import { DueSoon } from "@/features/home/due-soon";
import { EmptyCycle } from "@/features/home/empty-states";
import { Envelopes } from "@/features/home/envelopes";
import { homeHero } from "@/features/home/hero";

type Home = FunctionReturnType<typeof api.balances.getHome>;
type CommitmentList = FunctionReturnType<typeof api.commitments.list>;

export function PersonalHome({
	home,
	items,
	today,
}: {
	home: Home;
	items: CommitmentList["items"];
	today: string;
}) {
	if (home.empty) return <EmptyCycle startDate={home.startDate} endDate={home.endDate} />;

	const hero = homeHero(home);
	const daysLeft = formatDaysLeft(home.daysLeft);
	const daysLeftLabel = `${daysLeft.charAt(0).toUpperCase()}${daysLeft.slice(1)}`;

	return (
		<>
			<Text className="mt-6 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
				{hero.label}
			</Text>
			<View className="mt-2">
				<DayNumber whole={hero.whole} decimals={hero.decimals} over={hero.over} />
			</View>
			<Text className="mt-2.5 text-[13px] text-muted-foreground">{daysLeftLabel}</Text>

			<View className="mt-[22px]">
				<Envelopes home={home} />
			</View>

			<DueSoon items={items} today={today} />
		</>
	);
}
