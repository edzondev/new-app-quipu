import { defineSchema } from "convex/server";
import { tables } from "./generatedSchema";

export default defineSchema({
	...tables,
	passkey: tables.passkey.index("credentialID", ["credentialID"]),
});
