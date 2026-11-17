import { useEffect, useState } from "react";
import { askPostNotifications, canPostNotifications } from "@/features/detection/android";
import { DEFAULT_REMINDER, getReminder, setReminder } from "../../../modules/quipu-detection";

export function clockText(hour: number, minute: number) {
	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function useReminder() {
	const [reminder, setReminderState] = useState(DEFAULT_REMINDER);
	const [denied, setDenied] = useState(false);

	useEffect(() => {
		let alive = true;
		void Promise.all([getReminder(), canPostNotifications()]).then(([saved, canPost]) => {
			if (!alive) return;
			setReminderState(saved);
			setDenied(saved.enabled && !canPost);
		});
		return () => {
			alive = false;
		};
	}, []);

	async function toggle(enabled: boolean) {
		const granted = !enabled || (await askPostNotifications());
		setDenied(!granted);
		if (!granted) return;
		setReminderState({ ...reminder, enabled });
		await setReminder(enabled, reminder.hour, reminder.minute);
	}

	async function setTime(hour: number, minute: number) {
		setReminderState({ ...reminder, hour, minute });
		await setReminder(reminder.enabled, hour, minute);
	}

	return { reminder, denied, toggle, setTime };
}
