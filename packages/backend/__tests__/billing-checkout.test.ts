import { beforeEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import { planPrices } from "../shared/billing";
import { addProduct, harness, startUser, subscribe } from "./couple";

const sent = vi.hoisted(() => ({
	checkouts: [] as { products: string[]; currency: string; successUrl: string }[],
	portals: [] as { returnUrl: string }[],
}));

vi.mock("@polar-sh/sdk/funcs/customersGetExternal.js", () => ({
	customersGetExternal: async () => ({ ok: true, value: { id: "cus_polar" } }),
}));
vi.mock("@polar-sh/sdk/funcs/checkoutsCreate.js", () => ({
	checkoutsCreate: async (_core: unknown, input: (typeof sent.checkouts)[number]) => {
		sent.checkouts.push(input);
		return { ok: true, value: { url: "https://sandbox.polar.sh/checkout/abc" } };
	},
}));
vi.mock("@polar-sh/sdk/funcs/customerSessionsCreate.js", () => ({
	customerSessionsCreate: async (_core: unknown, input: (typeof sent.portals)[number]) => {
		sent.portals.push(input);
		return { ok: true, value: { customerPortalUrl: "https://sandbox.polar.sh/portal/abc" } };
	},
}));

beforeEach(() => {
	sent.checkouts.length = 0;
	sent.portals.length = 0;
});

async function withPlans() {
	const t = harness();
	const user = await startUser(t, "camila@correo.com", "Camila Rojas");
	await addProduct(t, "prod_year_usd", "year", [{ currency: "usd", amount: 2999 }]);
	await addProduct(t, "prod_year_a", "year", [{ currency: "pen", amount: 8990 }]);
	await addProduct(t, "prod_year_b", "year", [{ currency: "pen", amount: 9990 }]);
	await addProduct(t, "prod_month", "month", [{ currency: "pen", amount: 1290 }]);
	return { t, user };
}

test("startCheckout buys the product whose price the paywall shows", async () => {
	const { user } = await withPlans();
	const shown = planPrices(await user.as.query(api.billing.offer, {}));
	const { url } = await user.as.action(api.billing.startCheckout, {
		interval: "year",
		currency: "pen",
		returnTo: "/settings",
	});
	expect(url).toBe("https://sandbox.polar.sh/checkout/abc");
	expect(shown.year).toBe(8990);
	expect(sent.checkouts).toMatchObject([{ products: ["prod_year_a"], currency: "pen" }]);
});

test("after paying, Polar sends the person back to the page they were on, flagged", async () => {
	const { user } = await withPlans();
	await user.as.action(api.billing.startCheckout, {
		interval: "month",
		currency: "pen",
		returnTo: "/home?space=household",
	});
	expect(sent.checkouts[0]?.successUrl).toBe(
		"http://localhost:3000/home?space=household&checkout=return",
	);
});

test("a return path to another site comes back to Inicio", async () => {
	const { user } = await withPlans();
	const outside = [
		"//evil.com",
		"/\\evil.com",
		"/\t/evil.com",
		"/\n/evil.com",
		"https://evil.com",
		"javascript:alert(1)",
		"",
	];
	for (const returnTo of outside) {
		await user.as.action(api.billing.startCheckout, {
			interval: "month",
			currency: "pen",
			returnTo,
		});
	}
	expect(sent.checkouts.map((checkout) => checkout.successUrl)).toEqual(
		outside.map(() => "http://localhost:3000/home?checkout=return"),
	);
});

test("the portal sends the person back to the same page, without the payment flag", async () => {
	const { t, user } = await withPlans();
	await subscribe(t, user.userId);
	await user.as.action(api.billing.openPortal, { returnTo: "/settings" });
	expect(sent.portals).toMatchObject([{ returnUrl: "http://localhost:3000/settings" }]);
});

test("someone else's subscription is not one's own: nothing to confirm after a checkout", async () => {
	const { t, user } = await withPlans();
	const other = await startUser(t, "renzo@correo.com", "Renzo Paz");
	await subscribe(t, other.userId);
	expect(await user.as.query(api.billing.subscription, {})).toBeNull();
});
