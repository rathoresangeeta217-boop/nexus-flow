const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Remove top-level Vite import
content = content.replace(/import \{ createServer as createViteServer \} from "vite";\n/, '');

// Replace vite middleware initialization with dynamic import
const targetVite = `  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }`;

const newVite = `  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }`;

content = content.replace(targetVite, newVite);
fs.writeFileSync('server.ts', content);
console.log("Patched server.ts to use dynamic import for vite");
