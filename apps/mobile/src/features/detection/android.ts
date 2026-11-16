import { PermissionsAndroid, Platform } from "react-native";

/** Asked when detection or the reminder is turned on, not when the app opens. */
export async function askPostNotifications(): Promise<boolean> {
	if (Platform.OS !== "android") return false;
	if (Platform.Version < 33) return true;
	const result = await PermissionsAndroid.request(
		PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
	);
	return result === PermissionsAndroid.RESULTS.GRANTED;
}

/** Same answer as asking, without the dialog. */
export async function canPostNotifications(): Promise<boolean> {
	if (Platform.OS !== "android") return false;
	if (Platform.Version < 33) return true;
	return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}
