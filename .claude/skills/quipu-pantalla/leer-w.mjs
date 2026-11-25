import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";

const [id, platform = "android"] = process.argv.slice(2);
if (!id || !["android", "ios"].includes(platform)) {
	console.error("Uso: node leer-w.mjs <id> [android|ios]   (por defecto android)");
	process.exit(2);
}

const commonDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
	encoding: "utf8",
}).trim();
const dir = join(dirname(resolve(commonDir)), "docs", "diseno");
// Primero la plataforma pedida; si el id solo existe en la otra, se lee de ahí.
const names = platform === "ios" ? ["ios", "android"] : ["android", "ios"];
const files = names.map((name) => ({ name, path: join(dir, `diseno-${name}.html`) }));
if (!files.some((file) => existsSync(file.path))) {
	console.error(
		`No existen diseno-android.html ni diseno-ios.html en ${dir}. docs/ no se versiona: pídeselos a Edzon.`,
	);
	process.exit(1);
}

const found = files
	.filter((file) => existsSync(file.path))
	.map((file) => ({ ...file, text: readFileSync(file.path, "utf8") }))
	.find((file) => file.text.includes(`id="${id}"`));
if (!found) {
	console.error(`No existe ${id} en el diseño Android ni en el iOS.`);
	process.exit(1);
}
if (found.name !== platform) {
	console.error(`${id} no existe en ${platform}: leído de diseno-${found.name}.html.`);
}

const source = found.text;
const start = source.lastIndexOf("<", source.indexOf(`id="${id}"`));
// Una pantalla acaba en la siguiente pantalla, sección o bloque de referencia.
const rest = source.slice(start + 1);
const end = rest.search(/<div class="scr"|<div class="dsec"|<h2 /);
const block = source.slice(start, end === -1 ? undefined : start + 1 + end);

const toText = (html) =>
	html
		.replace(/<(style|script|svg)[\s\S]*?<\/\1>/g, "")
		.replace(/<\/(div|p|li|tr|h\d|section|dt|dd)>|<br\s*\/?>/g, "\n")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/[ \t]+/g, " ")
		.replace(/\n\s*/g, "\n")
		.trim();

// Las notas de comportamiento de cada pantalla viven en «detalle» (<dt>ID · …</dt><dd>…</dd>).
const note = source.match(new RegExp(`<dt>${id} · [\\s\\S]*?</dd>`));

console.log([toText(block), note && toText(note[0])].filter(Boolean).join("\n\n"));
