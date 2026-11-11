/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountDeletion from "../accountDeletion.js";
import type * as activity from "../activity.js";
import type * as auth from "../auth.js";
import type * as balances from "../balances.js";
import type * as billing from "../billing.js";
import type * as commitments from "../commitments.js";
import type * as cycles from "../cycles.js";
import type * as goals from "../goals.js";
import type * as household from "../household.js";
import type * as http from "../http.js";
import type * as model_budget from "../model/budget.js";
import type * as model_closeSummary from "../model/closeSummary.js";
import type * as model_commitments from "../model/commitments.js";
import type * as model_cycles from "../model/cycles.js";
import type * as model_events from "../model/events.js";
import type * as model_input from "../model/input.js";
import type * as model_plus from "../model/plus.js";
import type * as model_polarEvents from "../model/polarEvents.js";
import type * as model_polarWebhook from "../model/polarWebhook.js";
import type * as model_progress from "../model/progress.js";
import type * as model_purge from "../model/purge.js";
import type * as model_spaces from "../model/spaces.js";
import type * as polar from "../polar.js";
import type * as profiles from "../profiles.js";
import type * as progress from "../progress.js";
import type * as rateLimits from "../rateLimits.js";
import type * as settings from "../settings.js";
import type * as transactions from "../transactions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accountDeletion: typeof accountDeletion;
  activity: typeof activity;
  auth: typeof auth;
  balances: typeof balances;
  billing: typeof billing;
  commitments: typeof commitments;
  cycles: typeof cycles;
  goals: typeof goals;
  household: typeof household;
  http: typeof http;
  "model/budget": typeof model_budget;
  "model/closeSummary": typeof model_closeSummary;
  "model/commitments": typeof model_commitments;
  "model/cycles": typeof model_cycles;
  "model/events": typeof model_events;
  "model/input": typeof model_input;
  "model/plus": typeof model_plus;
  "model/polarEvents": typeof model_polarEvents;
  "model/polarWebhook": typeof model_polarWebhook;
  "model/progress": typeof model_progress;
  "model/purge": typeof model_purge;
  "model/spaces": typeof model_spaces;
  polar: typeof polar;
  profiles: typeof profiles;
  progress: typeof progress;
  rateLimits: typeof rateLimits;
  settings: typeof settings;
  transactions: typeof transactions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  polar: import("@convex-dev/polar/_generated/component.js").ComponentApi<"polar">;
};
