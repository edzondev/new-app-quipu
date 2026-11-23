import type { api } from "@quipu/backend/convex/_generated/api";
import { AMOUNT_KEYS, ENVELOPE_LABELS, formatCents } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";
import { Text, View } from "react-native";
import { SectionLabel } from "@/components/ui/section-label";
import { envelopeFillPercent } from "@/features/home/envelope-bar";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";

type Home = FunctionReturnType<typeof api.balances.getHome>;

const ORDER = ["needs", "wants", "savings"] as const;

export function Envelopes({ home }: { home: Home }) {
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
