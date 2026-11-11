import { checkoutsCreate } from "@polar-sh/sdk/funcs/checkoutsCreate.js";
import { customerSessionsCreate } from "@polar-sh/sdk/funcs/customerSessionsCreate.js";
import { customersCreate } from "@polar-sh/sdk/funcs/customersCreate.js";
import { customersGetExternal } from "@polar-sh/sdk/funcs/customersGetExternal.js";
import { ResourceNotFound } from "@polar-sh/sdk/models/errors/resourcenotfound.js";
import { ConvexError, v } from "convex/values";
import {
	findOffer,
	intervalValidator,
	type Offer,
	offerValidator,
	plusStatusValidator,
	returnUrl,
	toInterval,
} from "../shared/billing";
import { components } from "./_generated/api";
import { type ActionCtx, action, query } from "./_generated/server";
import { siteUrl } from "./auth";
import { getPlusStatus, getPlusSubscription } from "./model/plus";
import { checkAccess, requireUser } from "./model/spaces";
import { polar, polarCore } from "./polar";

const currency = v.union(v.literal("pen"), v.literal("usd"), v.literal("eur"));
const urlValidator = v.object({ url: v.string() });
const returnTo = v.string();

type Products = Awaited<ReturnType<typeof polar.listProducts>>;

/** Monthly and yearly Plus with their current prices per currency, from the synced (non-archived) products. */
function toOffers(products: Products) {
	return products.flatMap((product): Offer[] => {
		const productInterval = toInterval(product.recurringInterval);
		const prices = product.prices.flatMap((price) =>
			!price.isArchived && price.priceAmount !== undefined && price.priceCurrency
				? [{ currency: price.priceCurrency, amountCents: price.priceAmount }]
				: [],
		);
		return productInterval && prices.length > 0
			? [{ productId: product.id, interval: productInterval, prices }]
			: [];
	});
}

/** Empty until the first product.* webhook syncs the products: the UI shows "Precio por confirmar". */
export const offer = query({
	args: {},
	returns: v.array(offerValidator),
	handler: async (ctx) => {
		if (!(await checkAccess(ctx))) return [];
		return toOffers(await polar.listProducts(ctx));
	},
});

/** What Tu plan says about the signed-in person. Null when signed out. */
export const status = query({
	args: {},
	returns: v.union(plusStatusValidator, v.null()),
	handler: async (ctx) => {
		const user = await checkAccess(ctx);
		return user ? await getPlusStatus(ctx, user._id) : null;
	},
});

/**
 * The person's Polar customer, found by our userId (Polar's externalId) and never by email.
 * Created there if missing, then linked in the component so webhooks and the portal find it.
 */
async function getPolarCustomerId(ctx: ActionCtx, userId: string, email: string) {
	const linked = await polar.getCustomerByUserId(ctx, userId);
	if (linked) return linked.id;

	const existing = await customersGetExternal(polarCore, { externalId: userId });
	let customerId: string;
	if (existing.ok) {
		customerId = existing.value.id;
	} else if (existing.error instanceof ResourceNotFound) {
		const created = await customersCreate(polarCore, {
			email,
			externalId: userId,
			metadata: { userId },
		});
		if (!created.ok) throw created.error;
		customerId = created.value.id;
	} else {
		throw existing.error;
	}
	await ctx.runMutation(components.polar.lib.insertCustomer, { id: customerId, userId });
	return customerId;
}

/** Polar checkout URL for the chosen plan and currency. Changing plan goes through the portal. */
export const startCheckout = action({
	args: { interval: intervalValidator, currency, returnTo },
	returns: urlValidator,
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		if (await getPlusSubscription(ctx, user._id)) {
			throw new ConvexError("Ya tienes Plus. Cambia de plan desde el portal.");
		}
		const found = findOffer(toOffers(await polar.listProducts(ctx)), args.interval, args.currency);
		if (!found) throw new ConvexError("Precio por confirmar.");
		const checkout = await checkoutsCreate(polarCore, {
			products: [found.productId],
			customerId: await getPolarCustomerId(ctx, user._id, user.email),
			currency: args.currency,
			successUrl: returnUrl(siteUrl, args.returnTo, { checkout: "return" }),
		});
		if (!checkout.ok) throw checkout.error;
		return { url: checkout.value.url };
	},
});

/** Polar customer portal URL: change plan, update the card, cancel. */
export const openPortal = action({
	args: { returnTo },
	returns: urlValidator,
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		const customer = await polar.getCustomerByUserId(ctx, user._id);
		if (!customer) throw new ConvexError("Aún no tienes una suscripción.");
		const session = await customerSessionsCreate(polarCore, {
			customerId: customer.id,
			returnUrl: returnUrl(siteUrl, args.returnTo),
		});
		if (!session.ok) throw session.error;
		return { url: session.value.customerPortalUrl };
	},
});
