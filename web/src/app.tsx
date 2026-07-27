import { useState, useEffect } from "react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { initWasm } from "./lib/wasm";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  const [wasmReady, setWasmReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initWasm()
      .then(() => setWasmReady(true))
      .catch((err) => setError(String(err)));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-zinc-100">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-400">Failed to load</h1>
          <p className="text-zinc-400 max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  if (!wasmReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-zinc-100">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400">Loading nyblcode...</p>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
