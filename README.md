# bopcode

bopcode is a free, open-source coding game that teaches programming fundamentals through grid-based puzzles. Write programs in Bop — a small, purpose-built language — to guide a bot across increasingly challenging levels. No accounts, no tracking, no installs. Everything runs in your browser.

## How it works

The entire application runs client-side. A Rust bytecode VM compiled to WebAssembly executes Bop 0.4 code, including standard-library modules and reference parameters, while a React frontend renders the grid and plays back the results. Your progress is saved in localStorage and never leaves your device.

## Running locally

```bash
make wasm    # Compile Rust to WebAssembly
make dev     # Start the dev server
```

Then open [http://localhost:8080](http://localhost:8080) in your browser. After changing Rust code, re-run `make wasm`.

## License

MIT — see [LICENSE](LICENSE) for details.
