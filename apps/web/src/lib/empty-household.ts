/**
 * Nuestro espacio picked without a household: there is no cycle to load. The layout shows the
 * invite screen instead of the page, so the loaders skip their fetch.
 */
export function isEmptyHousehold(context: {
	space: "personal" | "household";
	hasHousehold: boolean;
}) {
	return context.space === "household" && !context.hasHousehold;
}
