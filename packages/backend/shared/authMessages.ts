import { waitSeconds } from "./validation";

export const authMessages = {
	INVALID_OTP: "That code does not match.",
	OTP_EXPIRED: "This code expired. Request a new one.",
	TOO_MANY_ATTEMPTS: "You entered the wrong code 3 times. Request a new one.",
	EMAIL_NOT_ALLOWED: "We cannot register accounts with that email domain.",
	PASSKEY: "We could not use your passkey. Try a code sent to your email.",
	ALREADY_HAD_ACCOUNT: "You already had an account with this email. You are signed in to it.",
	CODE_IF_ACCOUNT_EXISTS: "If this email has an account, a code was sent.",
	CODE_DURATION: "The code is valid for 10 minutes.",
	GENERIC: "We could not complete that. Try again.",
} as const;

export function waitNotice(seconds: number) {
	const minutes = Math.floor(seconds / 60);
	const remainder = Math.max(0, seconds % 60);
	return `You can request another code in ${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function errorText(code: string | undefined, message?: string, status?: number) {
	if (code === "CODE_IF_ACCOUNT_EXISTS") return authMessages.CODE_IF_ACCOUNT_EXISTS;
	if (code === "GENERIC") return authMessages.GENERIC;
	if (code === "INVALID_OTP") return authMessages.INVALID_OTP;
	if (code === "OTP_EXPIRED") return authMessages.OTP_EXPIRED;
	if (code === "TOO_MANY_ATTEMPTS") return authMessages.TOO_MANY_ATTEMPTS;
	if (code === "EMAIL_NOT_ALLOWED") return authMessages.EMAIL_NOT_ALLOWED;
	if (code === "WAIT_TO_RESEND" || status === 429) {
		const seconds = waitSeconds.safeParse(message);
		if (seconds.success) return waitNotice(seconds.data);
		return "You can request another code in a moment.";
	}
	return authMessages.GENERIC;
}
