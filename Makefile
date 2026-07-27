.PHONY: wasm test build-all dev clean

wasm:
	cd crates/nyblcode-wasm && wasm-pack build --target web --out-dir ../../web/src/wasm

test:
	cargo test

build-all: test wasm
	cd web && bun run build

dev:
	cd web && bun run dev

clean:
	cargo clean
	rm -rf web/src/wasm
	rm -rf web/dist
