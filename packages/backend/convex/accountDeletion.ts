import { APIError } from "better-auth/api";
import { ConvexError, type Infer, v } from "convex/values";
import { getLimaDate } from "../shared/dates";
import { runsAtFor } from "../shared/deletion";
import { internal } from "./_generated/api";
import { internalMutation, type MutationCtx, mutation } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { leaveSpace } from "./household";
import { purgeSpace } from "./model/purge";
import { getHousehold, getMembers, getPersonalSpace } from "./model/spaces";
import { getProfile, requireProfile } from "./profiles";

const PENDING = "Tu cuenta ya se está eliminando.";
const NOTHING_TO_CANCEL = "Tu cuenta no se está eliminando.";
const WAIT = "Espera un momento antes de intentarlo otra vez.";
const WRONG_CODE = "Código incorrecto.";
const CODE_ERRORS: Record<string, string> = {
	OTP_EXPIRED: "El código venció. Pide otro.",
	INVALID_OTP: WRONG_CODE,
	TOO_MANY_ATTEMPTS: WRONG_CODE,
};
// The codes Better Auth keeps per email: the ones we send for signing in and for this.
const CODE_TYPES = ["sign-in", "email-verification"];

/** Sends a code to the email of the account, never to one the client names. */
export const requestCode = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const { user, profile } = await requireProfile(ctx);
		if (profile.deletionRunsAt !== undefined) throw new ConvexError(PENDING);
		try {
			await createAuth(ctx).api.sendVerificationOTP({
				body: { email: user.email, type: "email-verification" },
			});
		} catch (error) {
			if (error instanceof APIError && error.statusCode === 429) throw new ConvexError(WAIT);
			throw error;
		}
		return null;
	},
});

const confirmResult = v.union(
	v.object({ ok: v.literal(true) }),
	v.object({ ok: v.literal(false), error: v.string() }),
);

/**
 * A wrong or expired code is a result, not a thrown error: a throw would undo the failed attempt
 * Better Auth just counted, and the 3-attempt limit would never be reached. A good code stores the
 * date, closes every session and schedules the purge for that date.
 */
export const confirm = mutation({
	args: { code: v.string() },
	returns: confirmResult,
	handler: async (ctx, { code }): Promise<Infer<typeof confirmResult>> => {
		const { user, profile } = await requireProfile(ctx);
		if (profile.deletionRunsAt !== undefined) throw new ConvexError(PENDING);
		const auth = createAuth(ctx);
		try {
			await auth.api.checkVerificationOTP({
				body: { email: user.email, type: "email-verification", otp: code },
			});
		} catch (error) {
			const message = error instanceof APIError ? CODE_ERRORS[String(error.body?.code)] : undefined;
			if (message) return { ok: false, error: message };
			throw error;
		}
		const deletionRunsAt = runsAtFor(getLimaDate());
		await ctx.db.patch("profiles", profile._id, { deletionRunsAt });
		await (await auth.$context).internalAdapter.deleteUserSessions(user._id);
		// Cancelling does not unschedule it: purge checks the profile when it runs.
		await ctx.scheduler.runAt(deletionRunsAt, internal.accountDeletion.purge, { userId: user._id });
		return { ok: true };
	},
});

export const cancel = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const { profile } = await requireProfile(ctx);
		if (profile.deletionRunsAt === undefined || profile.deletionRunsAt <= Date.now()) {
			throw new ConvexError(NOTHING_TO_CANCEL);
		}
		await ctx.db.patch("profiles", profile._id, { deletionRunsAt: undefined });
		return null;
	},
});

type Leaving = { _id: string; name: string; email: string };

/** One batch of the purge. True when nothing is left: the profile goes last, with the user. */
async function purgeStep(ctx: MutationCtx, user: Leaving) {
	const household = await getHousehold(ctx, user._id);
	if (household) {
		const members = await getMembers(ctx, household._id);
		const mine = members.find((member) => member.userId === user._id);
		const partner = members.find((member) => member.userId !== user._id);
		if (mine && partner) await leaveSpace(ctx, household, mine, user, partner.userId);
		else await purgeSpace(ctx, household._id);
		return false;
	}
	const personal = await getPersonalSpace(ctx, user._id);
	if (personal) {
		await purgeSpace(ctx, personal._id);
		return false;
	}

	const { adapter, internalAdapter } = await createAuth(ctx).$context;
	await adapter.deleteMany({ model: "passkey", where: [{ field: "userId", value: user._id }] });
	for (const type of CODE_TYPES) {
		await internalAdapter.deleteVerificationByIdentifier(`${type}-otp-${user.email}`);
	}
	// Sessions and accounts too; the onDelete trigger removes the profile.
	await internalAdapter.deleteUser(user._id);
	return true;
}

/**
 * Deletes everything of a person once their date has come, one batch per run, calling itself
 * until done. A run before the date, after a cancel or with no request does nothing.
 */
export const purge = internalMutation({
	args: { userId: v.string() },
	returns: v.null(),
	handler: async (ctx, { userId }) => {
		const profile = await getProfile(ctx, userId);
		if (profile?.deletionRunsAt === undefined || profile.deletionRunsAt > Date.now()) return null;
		const user = await authComponent.getAnyUserById(ctx, userId);
		if (!user) return null;
		if (!(await purgeStep(ctx, user))) {
			await ctx.scheduler.runAfter(0, internal.accountDeletion.purge, { userId });
		}
		return null;
	},
});
