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
const html = join(dirname(resolve(commonDir)), "docs", "diseno", "rediseno-movil.html");
if (!existsSync(html)) {
	console.error(`No existe ${html}. docs/ no se versiona: pídeselo a Edzon.`);
	process.exit(1);
}

const source = readFileSync(html, "utf8");
const start = source.indexOf(`id="${id}"`);
if (start === -1) {
	console.error(`No existe la pantalla ${id}.`);
	process.exit(1);
}
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
