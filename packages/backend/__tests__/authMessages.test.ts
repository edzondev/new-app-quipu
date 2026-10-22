import { expect, test } from "vitest";
import { authMessages, errorText, waitNotice } from "../shared/authMessages";

test("sign-in notices are plain English", () => {
	expect(authMessages.INVALID_OTP).toBe("That code does not match.");
	expect(authMessages.OTP_EXPIRED).toBe("This code expired. Request a new one.");
	expect(authMessages.TOO_MANY_ATTEMPTS).toBe(
		"You entered the wrong code 3 times. Request a new one.",
	);
	expect(authMessages.EMAIL_NOT_ALLOWED).toBe(
		"We cannot register accounts with that email domain.",
	);
	expect(authMessages.PASSKEY).toBe(
		"We could not use your passkey. Try a code sent to your email.",
	);
	expect(waitNotice(65)).toBe("You can request another code in 1:05");
	expect(JSON.stringify(authMessages).toLowerCase()).not.toContain("password");
});

test("each errorText code has its own phrase", () => {
	const phrases = [
		errorText("CODE_IF_ACCOUNT_EXISTS"),
		errorText("GENERIC"),
		errorText("INVALID_OTP"),
		errorText("OTP_EXPIRED"),
		errorText(undefined, "65", 429),
	];
	expect(phrases).toEqual([
		"If this email has an account, a code was sent.",
		"We could not complete that. Try again.",
		"That code does not match.",
		"This code expired. Request a new one.",
		"You can request another code in 1:05",
	]);
	expect(new Set(phrases).size).toBe(phrases.length);
	expect(errorText("WAIT_TO_RESEND", "65")).toBe(phrases[4]);
	expect(errorText("EMAIL_NOT_ALLOWED")).toBe(
		"We cannot register accounts with that email domain.",
	);
	expect(errorText("TOO_MANY_ATTEMPTS")).toBe(
		"You entered the wrong code 3 times. Request a new one.",
	);
	expect(errorText("UNKNOWN_CODE")).toBe("We could not complete that. Try again.");
});
