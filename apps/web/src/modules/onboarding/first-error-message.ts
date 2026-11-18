// TanStack Form 1.33.5 types a field's errors from form and field validators only, so inside
// withForm they come out as `never` even though the group validators fill them with issues.
// Remove this if the library starts typing group errors.
export function firstErrorMessage(errors: ReadonlyArray<unknown>): string | undefined {
	const first = errors[0];
	if (typeof first === "object" && first !== null && "message" in first) {
		return typeof first.message === "string" ? first.message : undefined;
	}
	return undefined;
}
