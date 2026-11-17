// One-off: reads the unzipped export of the old Quipu and prepares the rows of `migrationImports`.
//
//   node scripts/migrate-old/main.mjs <export> --counts      totals only
//   node scripts/migrate-old/main.mjs <export> --check       balances, old against converted
//   node scripts/migrate-old/main.mjs <export> <out.jsonl>   writes the rows, outside the repo
//
// Plain .mjs: this package has no Node types. The logic lives in the .ts files next to it.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { check, isClean } from "./check.ts";
import { convert, fits } from "./convert.ts";
import { counts } from "./counts.ts";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const AUTH_USER = "_components/betterAuth/user";
const POLAR = "_components/polar";

function fail(message) {
	console.error(message);
	process.exit(1);
}

function isInside(folder, path) {
	const rel = relative(folder, resolve(path));
	return rel === "" || !(rel.startsWith("..") || resolve(rel) === rel);
}

function tableFile(folder, table) {
	return join(folder, table, "documents.jsonl");
}

function readTable(folder, table) {
	const file = tableFile(folder, table);
	if (!existsSync(file)) fail(`No encontré ${table}/documents.jsonl en ${folder}`);
	return readFileSync(file, "utf8")
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line) => JSON.parse(line));
}

/** A table this PR only counts: an export without it is not an error. */
function readOptional(folder, table) {
	return existsSync(tableFile(folder, table)) ? readTable(folder, table) : null;
}

function readExport(folder) {
	return {
		users: readTable(folder, AUTH_USER),
		profiles: readTable(folder, "profiles"),
		financialCycles: readTable(folder, "financialCycles"),
		envelopes: readTable(folder, "envelopes"),
		subEnvelopes: readTable(folder, "subEnvelopes"),
		fixedCommitments: readTable(folder, "fixedCommitments"),
		expenses: readTable(folder, "expenses"),
		incomeEvents: readTable(folder, "incomeEvents"),
	};
}

function readCountOnly(folder) {
	return {
		financialSpaces: readOptional(folder, "financialSpaces"),
		spaceMembers: readOptional(folder, "spaceMembers"),
		commitmentReservations: readOptional(folder, "commitmentReservations"),
		internalTransfers: readOptional(folder, "internalTransfers"),
		polarCustomers: readOptional(folder, `${POLAR}/customers`),
		polarSubscriptions: readOptional(folder, `${POLAR}/subscriptions`),
	};
}

function printTotals(totals) {
	for (const [name, value] of Object.entries(totals)) {
		console.log(`${name}: ${value ?? "la tabla no está en el export"}`);
	}
}

const [folder, target] = process.argv.slice(2);
if (!folder || !target) {
	fail(
		"Uso: node scripts/migrate-old/main.mjs <carpeta-del-export> --counts | --check | <salida.jsonl>",
	);
}
if (!existsSync(folder)) fail(`No encontré la carpeta ${folder}`);

const old = readExport(folder);

if (target === "--counts") {
	printTotals(counts(old, readCountOnly(folder), Date.now()));
} else {
	const { rows, skipped } = convert(old);
	if (skipped.duplicateEmail > 0) {
		fail(
			`Hay ${skipped.duplicateEmail} usuarios con un email repetido. Resuélvelo antes de seguir.`,
		);
	}
	const tooBig = rows.filter((row) => !fits(row)).length;
	if (tooBig > 0)
		fail(`${tooBig} filas pasan el tope de tamaño. Hay que partirlas antes de cargar.`);

	const result = check(old, rows);
	if (target === "--check") {
		console.log(`personas comparadas: ${result.checked}`);
		printTotals(result.differences);
		if (!isClean(result)) fail("Hay diferencias de saldo. No cargues nada.");
		console.log("Cero diferencias.");
	} else {
		if (isInside(REPO, target)) fail("La salida tiene que estar fuera del repo.");
		if (!isClean(result)) fail("Hay diferencias de saldo. Corre --check y no cargues nada.");
		writeFileSync(target, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
		console.log(`${rows.length} filas escritas en ${target}`);
	}
}
