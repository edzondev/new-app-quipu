import { ConvexError, v } from "convex/values";
import { getLimaDate } from "../shared/dates";
import { mutation } from "./_generated/server";
import { createFirstCycle } from "./model/cycles";
import { requirePlus } from "./model/plus";
import {
	getHousehold,
	getPersonalSpace,
	requirePlan,
	requireSpace,
	requireUser,
} from "./model/spaces";
import { limitHouseholdJoin } from "./rateLimits";

const BAD_INPUT = "Revisa los datos e inténtalo otra vez.";
const NOT_FOUND = "No encontramos este dato.";
const NEED_HOUSEHOLD = "Aún no tienes un hogar.";
const ALREADY_IN = "Ya formas parte de un hogar.";
const FULL = "Este hogar ya tiene dos personas.";
const EXPIRED = "Este código ya no sirve. Pide uno nuevo.";
const RATE_LIMITED = "Demasiados intentos. Espera un momento.";
const INVITE_MS = 48 * 60 * 60 * 1000;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode() {
	const bytes = new Uint8Array(6);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

export const createHousehold = mutation({
	args: { name: v.optional(v.string()) },
	returns: v.null(),
	handler: async (ctx, { name }) => {
		const user = await requireUser(ctx);
		await requirePlus(ctx, user._id);
		if (await getHousehold(ctx, user._id)) throw new ConvexError(ALREADY_IN);

		const personal = await getPersonalSpace(ctx, user._id);
		if (!personal) throw new ConvexError("Termina tus primeros pasos.");
		const plan = await requirePlan(ctx, personal);
		const open = await ctx.db
			.query("cycles")
			.withIndex("by_space_start", (q) => q.eq("spaceId", personal._id))
			.order("desc")
			.first();
		if (!open) throw new ConvexError("No encontramos tu ciclo.");

		const trimmed = name?.trim();
		const spaceId = await ctx.db.insert("spaces", {
			kind: "household",
			ownerId: user._id,
			fundCents: 0,
			...(trimmed ? { name: trimmed } : {}),
		});
		await ctx.db.insert("spaceMembers", { spaceId, userId: user._id });
		await createFirstCycle(ctx, spaceId, plan, open.split, getLimaDate());
		return null;
	},
});

export const createInvite = mutation({
	args: {},
	returns: v.object({ code: v.string() }),
	handler: async (ctx) => {
		const { userId, space } = await requireSpace(ctx, "household");
		if (space.ownerId !== userId) throw new ConvexError(NOT_FOUND);

		let code = randomCode();
		for (let i = 0; i < 8; i++) {
			const clash = await ctx.db
				.query("spaces")
				.withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
				.first();
			if (!clash) break;
			code = randomCode();
		}
		await ctx.db.patch("spaces", space._id, {
			inviteCode: code,
			inviteExpiresAt: Date.now() + INVITE_MS,
		});
		return { code };
	},
});

export const joinHousehold = mutation({
	args: { code: v.string() },
	returns: v.null(),
	handler: async (ctx, { code }) => {
		const user = await requireUser(ctx);
		const normalized = code.trim().toUpperCase();
		if (normalized.length !== 6) throw new ConvexError(BAD_INPUT);

		if (!(await limitHouseholdJoin(ctx, user._id))) throw new ConvexError(RATE_LIMITED);
		if (await getHousehold(ctx, user._id)) throw new ConvexError(ALREADY_IN);

		const space = await ctx.db
			.query("spaces")
			.withIndex("by_inviteCode", (q) => q.eq("inviteCode", normalized))
			.unique();
		if (!space || space.kind !== "household") throw new ConvexError(EXPIRED);
		if (space.inviteExpiresAt === undefined || space.inviteExpiresAt <= Date.now()) {
			throw new ConvexError(EXPIRED);
		}

		const members = await ctx.db
			.query("spaceMembers")
			.withIndex("by_spaceId", (q) => q.eq("spaceId", space._id))
			.take(3);
		if (members.length >= 2) throw new ConvexError(FULL);

		await ctx.db.insert("spaceMembers", { spaceId: space._id, userId: user._id });
		// Invalidate the code without clearing optional fields (patch can't unset).
		await ctx.db.patch("spaces", space._id, { inviteExpiresAt: 0 });
		return null;
	},
});

export const leaveHousehold = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const user = await requireUser(ctx);
		const membership = await ctx.db
			.query("spaceMembers")
			.withIndex("by_userId", (q) => q.eq("userId", user._id))
			.first();
		if (!membership) throw new ConvexError(NEED_HOUSEHOLD);
		await ctx.db.delete("spaceMembers", membership._id);
		return null;
	},
});
