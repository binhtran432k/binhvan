.PHONY: gen
gen:
	bun --cwd packages/binhvan gen

.PHONY: gen-www
gen-www: gen
	bun --cwd packages/www gen

.PHONY: preview
preview: gen-www
	bun --cwd packages/www preview

.PHONY: dev
dev: gen-www
	bun --cwd packages/www dev

.PHONY: lint
lint:
	biome check

.PHONY: lint-fix
lint-fix:
	biome check --unsafe --write
