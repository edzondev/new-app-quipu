import { StyleSheet } from "react-native";
import Svg, { Ellipse, Path } from "react-native-svg";
import { useThemeColor } from "@/lib/use-theme-color";

const CORDS = [
	{ d: "M-45 50C40-45 65 15 96 66s45 54 68 12S200-16 250 2s110 45 240 0", token: "needs" },
	{ d: "M-45 76C35-17 56 46 80 91s50 57 77 9S204 10 249 26s110 45 240 0", token: "wants" },
	{ d: "M-45 102C27 7 48 71 66 116s49 57 78 11S207 36 252 52s110 45 240 0", token: "savings" },
] as const;

/** The three cords of Quipu, one per envelope, behind the logo of the welcome. */
export function CordsBand() {
	const colors = {
		needs: useThemeColor("--color-envelope-needs"),
		wants: useThemeColor("--color-envelope-wants"),
		savings: useThemeColor("--color-envelope-savings"),
	};

	return (
		<Svg
			style={StyleSheet.absoluteFill}
			viewBox="0 0 440 128"
			preserveAspectRatio="xMidYMid slice"
			accessibilityElementsHidden
		>
			{CORDS.map(({ d, token }) => (
				<Path
					key={token}
					d={d}
					fill="none"
					stroke={colors[token]}
					strokeWidth={10}
					strokeLinecap="round"
				/>
			))}
			<Ellipse
				cx={108}
				cy={83}
				rx={8}
				ry={10}
				rotation={-28}
				origin="108, 83"
				fill={colors.needs}
			/>
			<Ellipse cx={353} cy={51} rx={8} ry={10} rotation={10} origin="353, 51" fill={colors.wants} />
			<Ellipse cx={352} cy={77} rx={8} ry={10} fill={colors.savings} />
		</Svg>
	);
}
