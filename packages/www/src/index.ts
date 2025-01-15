import { main as mainBinhVan } from "binhvan";

const pageImports: string[] = ["~/pages/PMain/PMain.ts"];

async function main() {
	await mainBinhVan({
		args: Bun.argv,
		watchDirs: ["src"],
		external: ["*.svg"],
		scriptPath: import.meta.path,
		pageModules: await Promise.all(pageImports.map((x) => import(x))),
	});
}

if (import.meta.main) {
	main();
}
