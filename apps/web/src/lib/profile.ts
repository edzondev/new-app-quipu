import { api } from "@quipu/backend/convex/_generated/api";
import { createServerFn } from "@tanstack/react-start";
import { fetchAuthQuery } from "#/lib/auth-server";

export const getMyProfile = createServerFn({ method: "GET" }).handler(() =>
	fetchAuthQuery(api.profiles.myProfile, {}),
);
