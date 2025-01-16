import type { BinhVanPageFn } from "binhvan";
import { LBinhVan } from "binhvan/layouts";

const PMain: BinhVanPageFn = (van) => {
	return [
		{
			pathname: "index.html",
			content: LBinhVan(
				van,
				{
					headProps: {
						base: import.meta.env.BASE_URL,
						favicon: { type: "image/svg", href: "favicon.svg" },
					},
				},
				"Hello World",
			),
		},
	];
};

export default PMain;
