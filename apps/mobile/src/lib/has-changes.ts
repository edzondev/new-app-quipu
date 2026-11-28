/** A form's values: text, numbers, flags, null and objects of them. */
type FormValue = string | number | boolean | null | { readonly [key: string]: FormValue };

/** Whether a form's values differ from the ones it opened with, compared by value. */
export function hasChanges(initial: FormValue, current: FormValue): boolean {
	if (
		typeof initial !== "object" ||
		typeof current !== "object" ||
		initial === null ||
		current === null
	) {
		return initial !== current;
	}
	const keys = new Set([...Object.keys(initial), ...Object.keys(current)]);
	return [...keys].some((key) => hasChanges(initial[key] ?? null, current[key] ?? null));
}
