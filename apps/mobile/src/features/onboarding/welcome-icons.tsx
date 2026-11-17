import type { ReactNode } from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { useThemeColor } from "@/lib/use-theme-color";

function LineIcon({ children }: { children: ReactNode }) {
	const stroke = useThemeColor("--color-foreground");

	return (
		<Svg
			width={20}
			height={20}
			viewBox="0 0 24 24"
			fill="none"
			stroke={stroke}
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			{children}
		</Svg>
	);
}

export function EnvelopesIcon() {
	return (
		<LineIcon>
			<Path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
			<Path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
		</LineIcon>
	);
}

export function GoalsIcon() {
	return (
		<LineIcon>
			<Circle cx={12} cy={12} r={10} />
			<Circle cx={12} cy={12} r={6} />
			<Circle cx={12} cy={12} r={2} />
		</LineIcon>
	);
}

export function DayNumberIcon() {
	return (
		<LineIcon>
			<Circle cx={12} cy={12} r={10} />
			<Path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 18V6" />
		</LineIcon>
	);
}

export function BanksIcon() {
	return (
		<LineIcon>
			<Path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l8 5H4z" />
		</LineIcon>
	);
}
