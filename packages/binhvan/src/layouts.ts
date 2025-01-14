import type { ChildDom, Van } from "mini-van-plate/van-plate";
import { BinhVanHead, type BinhVanHeadProps } from "./components";

export interface LBinhVanProps {
	/** @default "en" */
	lang: string;
	/** @default [] */
	cssImports: string[];
	/** @default [] */
	deferCssImports: string[];
	/** @default [] */
	moduleJsImports: string[];
	/** @default {} */
	headProps: Partial<BinhVanHeadProps>;
	/** @default [] */
	headRest: ChildDom[];
}

const DEFAULT_PROPS: LBinhVanProps = {
	lang: "en",
	cssImports: [],
	deferCssImports: [],
	moduleJsImports: [],
	headProps: {},
	headRest: [],
};

export type BinhVanLayoutFn<T> = (
	van: Van,
	props: T,
	...rest: readonly ChildDom[]
) => string;

export const LBinhVan: BinhVanLayoutFn<Partial<LBinhVanProps>> = (
	van,
	props,
	...rest
) => {
	const { head, body, link, noscript, script } = van.tags;

	const ps: LBinhVanProps = {
		...DEFAULT_PROPS,
		...props,
	};

	return van.html(
		{ lang: ps.lang },
		head(
			BinhVanHead(ps.headProps, ...ps.headRest),
			...ps.cssImports.map((href) => link({ rel: "stylesheet", href: href })),
			...ps.deferCssImports.map((href) =>
				link({
					rel: "preload",
					href: href,
					as: "style",
					onload: "this.onload=null;this.rel='stylesheet'",
				}),
			),
			...ps.deferCssImports.map((href) =>
				noscript(link({ rel: "stylesheet", href: href })),
			),
		),
		body(
			...rest,
			...ps.moduleJsImports.map((href) =>
				script({ type: "module", src: href }),
			),
		),
	);
};
