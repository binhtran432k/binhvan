import { isolatedDeclaration } from "oxc-transform";

async function main() {
	await Bun.$`rm -rf dist`;
	const result = await Bun.build({
		entrypoints: ["src/index.ts", "src/components.ts", "src/layouts.ts"],
		external: ["mini-van-plate"],
    target: "bun",
		root: "src",
		outdir: "dist",
		splitting: true,
		minify: true,
		plugins: [
			{
				name: "types",
				setup(builder) {
					builder.onLoad({ filter: /\.ts$/ }, async (args) => {
						const { code } = isolatedDeclaration(
							args.path,
							await Bun.file(args.path).text(),
						);
						await Bun.write(
							args.path.replace("src", "dist").replace(/\.ts$/, ".d.ts"),
							code,
						);
					});
				},
			},
		],
	});
	if (!result.success) {
		for (const log of result.logs) {
			console.error(log);
		}
	}
}

if (import.meta.main) {
	main();
}
