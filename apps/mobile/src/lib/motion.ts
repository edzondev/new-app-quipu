import { Easing, FadeIn, FadeOut, Keyframe, LinearTransition } from "react-native-reanimated";

// Every animation reads from here. Reanimated defaults to ReduceMotion.System, so with the
// system setting on these jump straight to their end value.

export const DURATION = { fast: 120, base: 200, moderate: 280 } as const;

export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

/** No bounce. Reanimated 4 reads `duration` as perceptual: the real run is about 1.5× longer. */
export const SPRING = {
	snappy: { duration: 250, dampingRatio: 1 },
	smooth: { duration: 400, dampingRatio: 1 },
} as const;

/** New content arrives: fades in and rises 8 px. */
export const enter = new Keyframe({
	0: { opacity: 0, transform: [{ translateY: 8 }] },
	100: { opacity: 1, transform: [{ translateY: 0 }], easing: easeOut },
}).duration(DURATION.base);

/** Content leaves: only fades, faster than it came. */
export const exit = FadeOut.duration(DURATION.fast);

/** For things that should not move while they appear (an overlay, a spinner). */
export const fadeIn = FadeIn.duration(DURATION.base).easing(easeOut);

// A sheet's views: going deeper, the new view comes in from the right and the form leaves to the left;
// going back, the other way round. A short shift with a fade, so it reads as a step, not a new screen.
const VIEW_SHIFT = 48;

const slideIn = (fromX: number) =>
	new Keyframe({
		0: { opacity: 0, transform: [{ translateX: fromX }] },
		100: { opacity: 1, transform: [{ translateX: 0 }], easing: easeOut },
	}).duration(DURATION.moderate);

const slideOut = (toX: number) =>
	new Keyframe({
		0: { opacity: 1, transform: [{ translateX: 0 }] },
		100: { opacity: 0, transform: [{ translateX: toX }], easing: easeOut },
	}).duration(DURATION.moderate);

/** The first view of a sheet (the form): it leaves and comes back on the left. */
export const rootView = { entering: slideIn(-VIEW_SHIFT), exiting: slideOut(-VIEW_SHIFT) };

/** A view one step in (a list, a confirmation): it comes and goes on the right. */
export const nestedView = { entering: slideIn(VIEW_SHIFT), exiting: slideOut(VIEW_SHIFT) };

/** Neighbours slide to their new place when something above them opens or closes. */
export const layout = LinearTransition.springify(SPRING.smooth.duration).dampingRatio(
	SPRING.smooth.dampingRatio,
);
