import { requireOptionalNativeModule } from "expo";

export type Bank = {
	name: string;
	packageName: string;
	installed: boolean;
	chosen: boolean;
};

export type Reminder = {
	enabled: boolean;
	hour: number;
	minute: number;
};

type Native = {
	isAccessEnabled(): boolean;
	openAccessSettings(): void;
	getBanks(): Promise<Bank[]>;
	setChosenBanks(packageNames: string[]): Promise<void>;
	setReminder(enabled: boolean, hour: number, minute: number): Promise<void>;
	getReminder(): Promise<Reminder>;
	markLoggedToday(): Promise<void>;
};

const native = requireOptionalNativeModule<Native>("QuipuDetection");

export const DEFAULT_REMINDER: Reminder = { enabled: false, hour: 23, minute: 30 };

export function isAccessEnabled(): boolean {
	return native?.isAccessEnabled() ?? false;
}

export function openAccessSettings(): void {
	native?.openAccessSettings();
}

export async function getBanks(): Promise<Bank[]> {
	if (!native) return [];
	return native.getBanks();
}

export async function setChosenBanks(packageNames: string[]): Promise<void> {
	if (!native) return;
	await native.setChosenBanks(packageNames);
}

export async function setReminder(enabled: boolean, hour: number, minute: number): Promise<void> {
	if (!native) return;
	await native.setReminder(enabled, hour, minute);
}

export async function getReminder(): Promise<Reminder> {
	if (!native) return DEFAULT_REMINDER;
	return native.getReminder();
}

export async function markLoggedToday(): Promise<void> {
	if (!native) return;
	await native.markLoggedToday();
}
