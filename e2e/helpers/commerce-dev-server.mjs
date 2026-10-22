import { createServer } from "vite";
import { join } from "node:path";
import { tmpdir } from "node:os";

const api = new URL(process.env.SPACE_CALL_LOCAL_API_URL);
if (api.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(api.hostname))
  throw new Error("Commerce acceptance proxy requires a local Supabase API");

const server = await createServer({
  cacheDir: join(
    process.env.SPACE_CALL_TEST_STACK_DIR || join(tmpdir(), "space-call-commerce-test"),
    "vite-cache",
  ),
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/__test-supabase": {
        target: api.origin,
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/__test-supabase/, ""),
      },
    },
  },
});
await server.listen();
console.log("Local commerce frontend ready on port 5173.");
