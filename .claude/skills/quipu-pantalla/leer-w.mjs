import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";

const id = process.argv[2];
if (!id) {
	console.error("Uso: node leer-w.mjs W-Inicio");
	process.exit(2);
}

const commonDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
	encoding: "utf8",
}).trim();
// Móvil y referencia en rediseno-movil.html; las pantallas W-* de la web, en rediseno-web.html.
const dir = join(dirname(resolve(commonDir)), "docs", "diseno");
const files = ["rediseno-movil.html", "rediseno-web.html"]
	.map((name) => join(dir, name))
	.filter(existsSync);
if (files.length === 0) {
	console.error(`No existe rediseno-movil.html en ${dir}. docs/ no se versiona: pídeselo a Edzon.`);
	process.exit(1);
}

const source = files
	.map((file) => readFileSync(file, "utf8"))
	.find((text) => text.includes(`id="${id}"`));
if (!source) {
	console.error(`No existe la pantalla ${id}.`);
	process.exit(1);
}
const start = source.indexOf(`id="${id}"`);
const next = source.indexOf('<div class="scr', start);
const block = source.slice(start, next === -1 ? undefined : next);

console.log(
	block
		.replace(/<(style|script)[\s\S]*?<\/\1>/g, "")
		.replace(/<\/(div|p|li|tr|h\d|section)>|<br\s*\/?>/g, "\n")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/[ \t]+/g, " ")
		.replace(/\n\s*/g, "\n")
		.trim(),
);
