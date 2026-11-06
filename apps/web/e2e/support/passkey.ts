import type { BrowserContext, Page } from "@playwright/test";

/** A software authenticator, so a passkey can be created and used without a device. */
export async function addVirtualAuthenticator(context: BrowserContext, page: Page) {
	const cdp = await context.newCDPSession(page);
	await cdp.send("WebAuthn.enable");
	const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
		options: {
			protocol: "ctap2",
			transport: "internal",
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: true,
		},
	});
	return { cdp, authenticatorId };
}

type Authenticator = Awaited<ReturnType<typeof addVirtualAuthenticator>>;

/** Gives `to` the passkeys `from` holds: the same person on another device. */
export async function copyPasskeys(from: Authenticator, to: Authenticator) {
	const { credentials } = await from.cdp.send("WebAuthn.getCredentials", {
		authenticatorId: from.authenticatorId,
	});
	for (const credential of credentials) {
		await to.cdp.send("WebAuthn.addCredential", {
			authenticatorId: to.authenticatorId,
			credential,
		});
	}
}
