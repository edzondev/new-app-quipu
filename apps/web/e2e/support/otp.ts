import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const OTP_TIMEOUT_MS = 30_000;
// Run the CLI with node directly: kill() then stops the process itself, not just a shell around it.
const convexBin = path.join(
	path.dirname(createRequire(import.meta.url).resolve("convex/package.json")),
	"bin/main.js",
);
// The CLI reads CONVEX_DEPLOYMENT from packages/backend/.env.local.
const backendDir = path.join(import.meta.dirname, "../../../../packages/backend");

function findOtp(output: string, email: string) {
	const codes = [...output.matchAll(/OTP ([^\s:]+): (\d{6})/g)].filter(([, to]) => to === email);
	return codes.at(-1)?.[2];
}

/**
 * Reads the sign-in code of `email` from the Convex dev log. The deployment runs with
 * OTP_DELIVERY=log, so no real mail is sent. Call it right after asking for the code.
 */
export async function readOtp(email: string) {
	const logs = spawn(process.execPath, [convexBin, "logs", "--history", "30"], {
		cwd: backendDir,
	});
	let output = "";
	let timer: NodeJS.Timeout | undefined;

	const found = new Promise<string>((resolve, reject) => {
		logs.once("error", reject);
		logs.once("exit", () => reject(new Error("convex logs terminó sin mostrar el código")));
		logs.stdout.on("data", (chunk: Buffer) => {
			output += chunk.toString();
			const code = findOtp(output, email);
			if (code) resolve(code);
		});
	});
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => reject(new Error(`No llegó el código de ${email} en ${OTP_TIMEOUT_MS / 1000} s`)),
			OTP_TIMEOUT_MS,
		);
	});

	try {
		return await Promise.race([found, timeout]);
	} finally {
		clearTimeout(timer);
		logs.kill();
	}
}
