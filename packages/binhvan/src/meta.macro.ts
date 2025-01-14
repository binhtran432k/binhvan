import packageJson from "../package.json";

export function getMeta(name: string): string | undefined {
	switch (name) {
		case "generator":
			return `BinhVan v${packageJson.version}`;
	}
}
