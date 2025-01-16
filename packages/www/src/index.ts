import { main as mainBinhVan } from "binhvan";

const pageImports: string[] = ["~/pages/PMain/PMain.ts"];

async function main() {
	await mainBinhVan({
		watchDirs: ["src"],
		external: ["*.svg"],
		pageModules: await Promise.all(pageImports.map((x) => import(x))),
	});
}

if (import.meta.main) {
	main();
}
