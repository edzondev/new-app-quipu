import { checkoutsUpdate } from "@polar-sh/sdk/funcs/checkoutsUpdate.js";
import { customerSessionsCreate } from "@polar-sh/sdk/funcs/customerSessionsCreate.js";
import { ConvexError, type Infer, v } from "convex/values";
import { action, query } from "./_generated/server";
import { siteUrl } from "./auth";
import { getPlusSubscription } from "./model/plus";
import { checkAccess, requireUser } from "./model/spaces";
import { polar, polarCore } from "./polar";

const interval = v.union(v.literal("month"), v.literal("year"));
const currency = v.union(v.literal("pen"), v.literal("usd"), v.literal("eur"));
const offerValidator = v.object({
	productId: v.string(),
	interval,
	prices: v.array(v.object({ currency: v.string(), amountCents: v.number() })),
});
type Offer = Infer<typeof offerValidator>;
const urlValidator = v.object({ url: v.string() });
const RETURN_URL = `${siteUrl}/settings`;

type Products = Awaited<ReturnType<typeof polar.listProducts>>;

function toInterval(recurringInterval: string | null | undefined) {
	return recurringInterval === "month" || recurringInterval === "year" ? recurringInterval : null;
}

/** Monthly and yearly Plus with their prices per currency, from the synced (non-archived) products. */
function toOffers(products: Products) {
	return products.flatMap((product): Offer[] => {
		const productInterval = toInterval(product.recurringInterval);
		if (!productInterval) return [];
		const prices = product.prices.flatMap((price) =>
			!price.isArchived && price.priceAmount !== undefined && price.priceCurrency
				? [{ currency: price.priceCurrency, amountCents: price.priceAmount }]
				: [],
		);
		return [{ productId: product.id, interval: productInterval, prices }];
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

/** The paid subscription that gives Plus now, or null (a trial alone is not a subscription). */
export const subscription = query({
	args: {},
	returns: v.union(
		v.object({
			status: v.string(),
			interval: v.union(v.string(), v.null()),
			cancelAtPeriodEnd: v.boolean(),
			currentPeriodEnd: v.union(v.string(), v.null()),
			amountCents: v.union(v.number(), v.null()),
			currency: v.union(v.string(), v.null()),
		}),
		v.null(),
	),
	handler: async (ctx) => {
		const user = await checkAccess(ctx);
		const sub = user ? await getPlusSubscription(ctx, user._id) : undefined;
		if (!sub) return null;
		return {
			status: sub.status,
			interval: sub.recurringInterval,
			cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
			currentPeriodEnd: sub.currentPeriodEnd,
			amountCents: sub.amount,
			currency: sub.currency,
		};
	},
});

/** Polar checkout URL for the chosen plan and currency. Changing plan goes through the portal. */
export const startCheckout = action({
	args: { interval, currency },
	returns: urlValidator,
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);
		if (await getPlusSubscription(ctx, user._id)) {
			throw new ConvexError("Ya tienes Plus. Cambia de plan desde el portal.");
		}
		const found = toOffers(await polar.listProducts(ctx)).find(
			(item) =>
				item.interval === args.interval &&
				item.prices.some((price) => price.currency === args.currency),
		);
		if (!found) throw new ConvexError("Precio por confirmar.");
		const checkout = await polar.createCheckoutSession(ctx, {
			productIds: [found.productId],
			userId: user._id,
			email: user.email,
			origin: siteUrl,
			successUrl: RETURN_URL,
		});
		// The component cannot choose the currency, so set it on the checkout it created.
		const updated = await checkoutsUpdate(polarCore, {
			id: checkout.id,
			checkoutUpdate: { currency: args.currency },
		});
		if (!updated.ok) throw updated.error;
		return { url: updated.value.url };
	},
});

/** Polar customer portal URL: change plan, update the card, cancel. */
export const openPortal = action({
	args: {},
	returns: urlValidator,
	handler: async (ctx) => {
		const user = await requireUser(ctx);
		const customer = await polar.getCustomerByUserId(ctx, user._id);
		if (!customer) throw new ConvexError("Aún no tienes una suscripción.");
		const session = await customerSessionsCreate(polarCore, {
			customerId: customer.id,
			returnUrl: RETURN_URL,
		});
		if (!session.ok) throw session.error;
		return { url: session.value.customerPortalUrl };
	},
});
