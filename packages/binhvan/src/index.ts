import { watch } from "node:fs";
import { readdir } from "node:fs/promises";
import { parseArgs } from "node:util";
import type { BunFile } from "bun";
import { registerEnv } from "mini-van-plate/shared";
import van, { type Van } from "mini-van-plate/van-plate";

export interface BinhVanPage {
	pathname: string;
	content: string;
}

export type BinhVanPageFn = (van: Van) => BinhVanPage[];

export interface PageModule {
	default: (van: Van) => BinhVanPage[];
}

export interface BinhVanOpts {
	/** @default [] */
	watchDirs: string[];
	/** @default "public" */
	publicDir: string;
	/** @default ".cache" */
	cacheDir: string;
	/** @default "dist" */
	outDir: string;
	/** @default [] */
	pageModules: PageModule[];
	/** @default Bun.argv */
	args: string[];
	minify?: boolean;
	external?: string[];
}

const DEFAULT_OPTS: BinhVanOpts = {
	watchDirs: [],
	publicDir: "public",
	cacheDir: ".cache",
	outDir: "dist",
	args: Bun.argv,
	pageModules: [],
};

async function checkDirExists(path: string) {
	try {
		await readdir(path);
		return true;
	} catch (err) {
		return false;
	}
}

export async function main(opts: Partial<BinhVanOpts>): Promise<void> {
	const o: BinhVanOpts = {
		...DEFAULT_OPTS,
		...opts,
	};
	registerEnv({ van });

	const {
		values: cmdArgs,
		positionals: [, scriptPath],
	} = parseArgs({
		args: o.args,
		options: {
			dev: { type: "boolean" },
			preview: { type: "boolean" },
			port: { type: "string" },
			base: { type: "string" },
		},
		allowPositionals: true,
		strict: true,
	});

	import.meta.env.BASE_URL = cmdArgs.base;

	await Bun.$`rm -rf ${o.cacheDir} ${o.outDir}`;
	await Bun.$`mkdir -p ${o.cacheDir} ${o.outDir}`;
	await buildPages(o);
	if (await checkDirExists(o.publicDir)) {
		await Bun.$`cp -rn ${o.publicDir}/. ${o.outDir}`.nothrow();
	}

	if (cmdArgs.dev) {
		watchAndRebuild(o, scriptPath);
		serveServer(o, cmdArgs.port ?? 5000);
	} else if (cmdArgs.preview) {
		serveServer(o, cmdArgs.port ?? 4000);
	}
}

function watchAndRebuild(o: BinhVanOpts, scriptPath: string) {
	let time: Timer | undefined;
	async function watchChange(src: string) {
		if (await checkDirExists(src)) {
			watch(src, { recursive: true }, (_, fname) => {
				clearTimeout(time);
				time = setTimeout(async () => {
					await Bun.$`bun ${scriptPath}`;
					console.log(`Detected changing ${fname}`);
				}, 500);
			});
		}
	}
	for (const dir of o.watchDirs.concat(o.publicDir)) {
		watchChange(dir);
	}
}

function serveServer(o: BinhVanOpts, port: string | number) {
	async function getFile(pathname: string): Promise<BunFile | null> {
		const trimedPath = pathname.replace(/^\/|\/$/g, "");

		const file = Bun.file(`${o.outDir}/${trimedPath}`);
		if (await file.exists()) return file;

		const indexFile = Bun.file(`${o.outDir}/${trimedPath}/index.html`);
		if (await indexFile.exists()) return indexFile;

		const publicFile = Bun.file(`${o.publicDir}/${trimedPath}`);
		if (await publicFile.exists()) return publicFile;

		return null;
	}

	const server = Bun.serve({
		port,
		async fetch(req) {
			const url = new URL(req.url);

			const file = await getFile(url.pathname);
			if (file) return new Response(file);

			return new Response(await getFile("404.html"), { status: 404 });
		},
	});

	console.log(`Try visiting the server via http://localhost:${server.port}`);
}

async function buildPages(o: BinhVanOpts) {
	const entrypoints = await Promise.all(
		o.pageModules
			.flatMap((pageMod) => pageMod.default(van))
			.map(async (page) => {
				const writeUrl = new URL(
					page.pathname,
					Bun.pathToFileURL(`${o.cacheDir}/`),
				);
				await Bun.write(writeUrl, page.content);
				return Bun.fileURLToPath(writeUrl);
			}),
	);

	const result = await Bun.build({
		entrypoints,
		root: o.cacheDir,
		outdir: o.outDir,
		minify: o.minify,
		external: o.external,
		splitting: true,
	});

	if (!result.success) {
		for (const log of result.logs) {
			console.error(log);
		}
	}
}
