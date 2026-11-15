import { PermissionsAndroid, Platform } from "react-native";
import { getReminder, setReminder } from "../../../modules/quipu-detection";

/** Re-arms the saved alarm. Called on every launch; the native call is idempotent. */
export async function refreshReminder(): Promise<void> {
	const saved = await getReminder();
	await setReminder(saved.enabled, saved.hour, saved.minute);
}

/** Asked when detection or the reminder is turned on, not when the app opens. */
export async function askPostNotifications(): Promise<boolean> {
	if (Platform.OS !== "android" || Platform.Version < 33) return Platform.OS === "android";
	const result = await PermissionsAndroid.request(
		PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
	);
	return result === PermissionsAndroid.RESULTS.GRANTED;
}
