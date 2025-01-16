import type { BunPlugin } from "bun";
import { isolatedDeclaration } from "oxc-transform";

function getTypePlugin(): [plugin: BunPlugin, tsPathsSet: Set<string>] {
	const tsPathsSet = new Set<string>();
	const plugin: BunPlugin = {
		name: "types",
		setup(builder) {
			builder.onLoad({ filter: /\.ts$/ }, async (args) => {
				tsPathsSet.add(args.path);
			});
		},
	};
	return [plugin, tsPathsSet];
}

async function main() {
	await Bun.$`rm -rf dist`;
	const [typePlugin, tsPathsSet] = getTypePlugin();
	const result = await Bun.build({
		entrypoints: ["src/index.ts", "src/components.ts", "src/layouts.ts"],
		external: ["mini-van-plate"],
		target: "bun",
		root: "src",
		outdir: "dist",
		splitting: true,
		minify: true,
		plugins: [typePlugin],
	});
	for (const path of tsPathsSet) {
		const { code } = isolatedDeclaration(path, await Bun.file(path).text());
		await Bun.write(
			path.replace("src", "dist").replace(/\.ts$/, ".d.ts"),
			code,
		);
	}
	if (!result.success) {
		for (const log of result.logs) {
			console.error(log);
		}
	}
}

if (import.meta.main) {
	main();
}
