import type { api } from "@quipu/backend/convex/_generated/api";
import { AMOUNT_KEYS, ENVELOPE_LABELS, formatCents } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";
import { Text, View } from "react-native";

type Home = FunctionReturnType<typeof api.balances.getHome>;

const ORDER = ["needs", "wants", "savings"] as const;

const ENVELOPE_DOT = {
	needs: "bg-envelope-needs",
	wants: "bg-envelope-wants",
	savings: "bg-envelope-savings",
} as const;

export function Envelopes({ home }: { home: Home }) {
	return (
		<View>
			<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
				Sobres
			</Text>
			{ORDER.map((envelope) => {
				const key = AMOUNT_KEYS[envelope];
				const cents = home[key];
				const assignedCents = home.assigned[key];
				return (
					<View
						key={envelope}
						className="flex-row items-baseline justify-between gap-2.5 border-b border-border py-3"
					>
						<View className="min-w-0 flex-1 flex-row items-center gap-2.5">
							<View className={`size-2 shrink-0 rounded-full ${ENVELOPE_DOT[envelope]}`} />
							<Text className="shrink text-[15px] font-semibold text-foreground" numberOfLines={1}>
								{ENVELOPE_LABELS[envelope]}
							</Text>
						</View>
						<Text className="shrink-0 font-mono text-[15px] text-foreground">
							S/ {formatCents(Math.max(0, cents))}{" "}
							<Text className="text-[13px] text-muted-foreground">
								de S/ {formatCents(assignedCents)}
							</Text>
						</Text>
					</View>
				);
			})}
		</View>
	);
}
