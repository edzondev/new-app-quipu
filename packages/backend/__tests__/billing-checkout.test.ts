import { ResourceNotFound } from "@polar-sh/sdk/models/errors/resourcenotfound.js";
import { beforeEach, expect, test, vi } from "vitest";
import { api, components } from "../convex/_generated/api";
import { planPrices } from "../shared/billing";
import { addProduct, harness, startUser, subscribe } from "./couple";

type Result = { ok: true; value: { id: string } } | { ok: false; error: Error };

// Only Polar is simulated: what each call received, and what the customer calls answer.
const sent = vi.hoisted(() => {
	const checkouts: {
		products: string[];
		currency: string;
		successUrl: string;
		customerId: string;
	}[] = [];
	const portals: { returnUrl: string }[] = [];
	const created: { email: string; externalId: string; metadata: Record<string, string> }[] = [];
	const lookups: string[] = [];
	const answers: { lookup: () => Result; create: () => Result } = {
		lookup: () => ({ ok: true, value: { id: "cus_polar" } }),
		create: () => ({ ok: true, value: { id: "cus_new" } }),
	};
	return { checkouts, portals, created, lookups, answers };
});

vi.mock("@polar-sh/sdk/funcs/customersGetExternal.js", () => ({
	customersGetExternal: async (_core: unknown, input: { externalId: string }) => {
		sent.lookups.push(input.externalId);
		return sent.answers.lookup();
	},
}));
vi.mock("@polar-sh/sdk/funcs/customersCreate.js", () => ({
	customersCreate: async (_core: unknown, input: (typeof sent.created)[number]) => {
		sent.created.push(input);
		return sent.answers.create();
	},
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
	sent.created.length = 0;
	sent.lookups.length = 0;
	sent.answers.lookup = () => ({ ok: true, value: { id: "cus_polar" } });
	sent.answers.create = () => ({ ok: true, value: { id: "cus_new" } });
});

const notFound = () =>
	new ResourceNotFound(
		{ error: "ResourceNotFound", detail: "Not found" },
		{ request: new Request("https://sandbox.polar.sh"), response: new Response(), body: "" },
	);

const buyMonthly = (user: Awaited<ReturnType<typeof withPlans>>["user"]) =>
	user.as.action(api.billing.startCheckout, {
		interval: "month",
		currency: "pen",
		returnTo: "/home",
	});

const linkedCustomer = (t: Awaited<ReturnType<typeof withPlans>>["t"], userId: string) =>
	t.query(components.polar.lib.getCustomerByUserId, { userId });

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

test("a return path longer than 512 characters comes back to Inicio", async () => {
	const { user } = await withPlans();
	for (const returnTo of [`/${"a".repeat(511)}`, `/${"a".repeat(512)}`]) {
		await user.as.action(api.billing.startCheckout, {
			interval: "month",
			currency: "pen",
			returnTo,
		});
	}
	expect(sent.checkouts.map((checkout) => checkout.successUrl)).toEqual([
		`http://localhost:3000/${"a".repeat(511)}?checkout=return`,
		"http://localhost:3000/home?checkout=return",
	]);
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
	expect(await user.as.query(api.billing.status, {})).toEqual({
		kind: "trial",
		endsAt: expect.any(Number),
	});
});

test("a customer Polar already has under our userId is linked and checks out, none is created", async () => {
	const { t, user } = await withPlans();
	await buyMonthly(user);
	expect(sent.lookups).toEqual([user.userId]);
	expect(sent.created).toEqual([]);
	expect(sent.checkouts).toMatchObject([{ customerId: "cus_polar" }]);
	expect((await linkedCustomer(t, user.userId))?.id).toBe("cus_polar");
});

test("with no customer in Polar, one is created with our userId, linked, then checked out", async () => {
	const { t, user } = await withPlans();
	sent.answers.lookup = () => ({ ok: false, error: notFound() });
	await buyMonthly(user);
	expect(sent.lookups).toEqual([user.userId]);
	expect(sent.created).toEqual([
		{ email: "camila@correo.com", externalId: user.userId, metadata: { userId: user.userId } },
	]);
	expect(sent.checkouts).toMatchObject([{ customerId: "cus_new" }]);
	expect((await linkedCustomer(t, user.userId))?.id).toBe("cus_new");
});

test("a Polar error finding or creating the customer opens no checkout and links nothing", async () => {
	const { t, user } = await withPlans();
	sent.answers.lookup = () => ({ ok: false, error: new Error("Polar is down") });
	await expect(buyMonthly(user)).rejects.toThrow();
	expect(sent.created).toEqual([]);

	sent.answers.lookup = () => ({ ok: false, error: notFound() });
	sent.answers.create = () => ({ ok: false, error: new Error("Polar is down") });
	await expect(buyMonthly(user)).rejects.toThrow();
	expect(sent.created).toHaveLength(1);

	expect(sent.lookups).toEqual([user.userId, user.userId]);
	expect(sent.checkouts).toEqual([]);
	expect(await linkedCustomer(t, user.userId)).toBeNull();
});
