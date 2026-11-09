/** "Luis Paz" → "Luis". The names shown and shared are first names only. */
export function firstName(name: string): string {
	return name.trim().split(/\s+/)[0] ?? "";
}
