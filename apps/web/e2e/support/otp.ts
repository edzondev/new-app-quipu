import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const TIMEOUT_MS = 30_000;
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
 * Streams the Convex dev log (the deployment runs with OTP_DELIVERY=log, so no mail is sent) and
 * resolves once it is connected. Start it before asking for the code, so no line is missed, and
 * `close()` it in a `finally`. `read()` starts its 30 s limit when called: call it right after the request.
 */
export async function watchOtp(email: string) {
	const logs = spawn(process.execPath, [convexBin, "logs"], { cwd: backendDir });
	let output = "";
	// The CLI prints its "Watching logs" banner on stderr and the log lines on stdout.
	const streams = [logs.stdout, logs.stderr];
	for (const stream of streams) {
		stream.on("data", (chunk: Buffer) => {
			output += chunk.toString();
		});
	}

	const waitFor = (find: () => string | undefined, what: string) =>
		new Promise<string>((resolve, reject) => {
			const timer = setTimeout(
				() => reject(new Error(`No llegó ${what} en ${TIMEOUT_MS / 1000} s`)),
				TIMEOUT_MS,
			);
			const check = () => {
				const found = find();
				if (!found) return;
				clearTimeout(timer);
				resolve(found);
			};
			for (const stream of streams) stream.on("data", check);
			logs.once("error", reject);
			logs.once("exit", () => reject(new Error(`convex logs terminó antes de ${what}`)));
			check();
		});

	try {
		await waitFor(() => (output.includes("Watching logs") ? "ready" : undefined), "conectar");
	} catch (error) {
		logs.kill();
		throw error;
	}
	return {
		read: () => waitFor(() => findOtp(output, email), `el código de ${email}`),
		close: () => logs.kill(),
	};
}
