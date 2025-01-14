import { env } from "mini-van-plate/shared";
import type { ChildDom } from "mini-van-plate/van-plate";

import { getMeta } from "./meta.macro.js" with { type: "macro" };

export interface BinhVanHeadProps {
	/** @example { type: "image/svg+xml", href: "/favicon.svg" } */
	favicon?: { type: string; href: string };
	/** @default "Binh Van's Page" */
	title: string;
	base?: string;
	description?: string;
	canonicalUrl?: string;
	manifestUrl?: string;
	/** @default {} */
	extraMetaMap: { [name: string]: string };
}

export type BinhVanComponentFn<T> = (
	props: T,
	...rest: readonly ChildDom[]
) => ChildDom;

const DEFAULT_PROPS: BinhVanHeadProps = {
	title: "Binh Van's Page",
	extraMetaMap: {},
};

export const BinhVanHead: BinhVanComponentFn<Partial<BinhVanHeadProps>> = (
	props,
	...rest
) => {
	const { base, link, title, meta } = env.van.tags;

	const ps: BinhVanHeadProps = {
		...DEFAULT_PROPS,
		...props,
	};

	return [
		// Global Metadata
		meta({ charset: "utf-8" }),
		meta({ name: "viewport", content: "width=device-width,initial-scale=1" }),
		ps.favicon && link({ rel: "icon", ...ps.favicon }),
		meta({ name: "generator", content: getMeta("generator") }),
		// Primary Meta Tags
		ps.base && base({ href: ps.base }),
		title(ps.title),
		meta({ name: "title", content: ps.title }),
		ps.description && meta({ name: "description", content: ps.description }),
		// Misc
		...Object.entries(ps.extraMetaMap).map(([name, content]) =>
			meta({ name, content }),
		),
		ps.canonicalUrl && link({ rel: "canonical", href: ps.canonicalUrl }),
		ps.manifestUrl && link({ rel: "manifest", href: ps.manifestUrl }),
		...rest,
	].filter(Boolean);
};
