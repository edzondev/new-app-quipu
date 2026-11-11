import { Polar } from "@convex-dev/polar";
import { PolarCore } from "@polar-sh/sdk/core.js";
import { components } from "./_generated/api";
import { env, internalAction } from "./_generated/server";

// The component only calls getUserInfo from its own polar.api() helpers, which we do not use:
// billing.ts resolves the Better Auth user itself and passes the userId in.
export const polar = new Polar(components.polar, {
	getUserInfo: () => {
		throw new Error("Not used: billing.ts resolves the user");
	},
	organizationToken: env.POLAR_ORGANIZATION_TOKEN,
	server: env.POLAR_SERVER,
});

export const polarCore = new PolarCore({
	accessToken: env.POLAR_ORGANIZATION_TOKEN,
	server: env.POLAR_SERVER,
});

/** Pulls the products from Polar into the component. The webhook schedules it on product.* events. */
export const syncProducts = internalAction({
	args: {},
	handler: (ctx) => polar.syncProducts(ctx),
});
