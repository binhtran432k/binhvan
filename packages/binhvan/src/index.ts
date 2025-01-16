import { watch } from "node:fs";
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
			rebuildOnly: { type: "boolean" },
			preview: { type: "boolean" },
			port: { type: "string" },
		},
		allowPositionals: true,
		strict: true,
	});

	await Bun.$`rm -rf ${o.cacheDir} ${o.outDir}`;
	await Bun.$`mkdir -p ${o.cacheDir} ${o.outDir}`;
	await buildPages(o);
	await Bun.$`cp ${o.publicDir}/* ${o.outDir}`;

	if (cmdArgs.rebuildOnly) {
		return;
	}

	if (cmdArgs.dev) {
		watchAndRebuild(o, scriptPath);
	}

	if (cmdArgs.dev || cmdArgs.preview) {
		serveServer(o, cmdArgs.port);
	}
}

function watchAndRebuild(o: BinhVanOpts, scriptPath: string) {
	let time: Timer | undefined;
	function watchChange(src: string) {
		watch(src, { recursive: true }, (_, fname) => {
			clearTimeout(time);
			time = setTimeout(async () => {
				await Bun.$`bun ${scriptPath} --rebuildOnly`;
				console.log(`Detected changing ${fname}`);
			}, 500);
		});
	}
	for (const dir of o.watchDirs) {
		watchChange(dir);
	}
	watchChange(o.publicDir);
}

function serveServer(o: BinhVanOpts, port?: string) {
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
		port: port ?? 5000,
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
	const writedUrls: URL[] = [];
	for (const pageMod of o.pageModules) {
		const pages = pageMod.default(van);

		for (const page of pages) {
			const writeUrl = new URL(
				page.pathname,
				Bun.pathToFileURL(`${o.cacheDir}/`),
			);
			await Bun.write(writeUrl, page.content);
			writedUrls.push(writeUrl);
		}
	}

	const result = await Bun.build({
		entrypoints: writedUrls.map((url) => Bun.fileURLToPath(url)),
		root: o.cacheDir,
		outdir: o.outDir,
		minify: o.minify,
		external: o.external,
		html: true,
		experimentalCss: true,
		splitting: true,
	});

	if (!result.success) {
		for (const log of result.logs) {
			console.error(log);
		}
	}
}
