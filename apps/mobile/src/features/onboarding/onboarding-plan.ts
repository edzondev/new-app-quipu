import type { Split } from "@quipu/backend/shared/plan";

export const DEFAULT_SPLIT: Split = { needs: 50, wants: 30, savings: 20 };
export const SPLIT_STEP = 5;

export function stepSplit(split: Split, key: keyof Split, delta: number): Split {
	return { ...split, [key]: Math.min(100, Math.max(0, split[key] + delta)) };
}
