import { expect, test } from "vitest";
import { accountAlreadyExisted, emptyDraft, readDraft } from "../shared/createAccount";

const now = 1_700_000_000_000;

test("a non-string name does not break the draft", () => {
	expect(readDraft('{"name":5}', now)).toEqual(emptyDraft);
	expect(readDraft('{"name":5,"email":1,"phase":"code"}', now)).toEqual({
		...emptyDraft,
		phase: "code",
	});
});

test("a valid draft is kept and an invalid one is cleared", () => {
	const waitUntil = now + 1000;
	expect(
		readDraft(
			JSON.stringify({
				name: "Ana",
				email: "ana@correo.com",
				phase: "passkey",
				waitUntil,
			}),
			now,
		),
	).toEqual({
		name: "Ana",
		email: "ana@correo.com",
		phase: "passkey",
		waitUntil,
	});
	expect(readDraft("no-json", now)).toEqual(emptyDraft);
	expect(readDraft("[1]", now)).toEqual(emptyDraft);
	expect(readDraft("null", now)).toEqual(emptyDraft);
	expect(readDraft(JSON.stringify({ phase: "already-existed", waitUntil: now - 1 }), now)).toEqual(
		emptyDraft,
	);
});

test("accountAlreadyExisted compares a two-hour server gap", () => {
	const created = "2000-01-01T00:00:00.000Z";
	expect(accountAlreadyExisted(created, "2000-01-01T03:00:01.000Z")).toBe(true);
	expect(accountAlreadyExisted(created, "2000-01-01T01:00:00.000Z")).toBe(false);
	expect(accountAlreadyExisted(created, created)).toBe(false);
	expect(accountAlreadyExisted(created, undefined)).toBe(false);
});
