import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // SPA fallback: serve index.html for GET requests to non-API, non-file routes
  // This must be a middleware, not a route, to work after all other routes
  app.use((req, res, next) => {
    // Only handle GET requests for HTML pages (browser navigation)
    if (req.method !== 'GET') {
      return next();
    }

    // Don't interfere with API routes or health check
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }

    // Don't send HTML for requests expecting other content types
    if (req.path.includes('.')) {
      return next(); // Has file extension, let it 404 if not found
    }

    // SPA fallback for browser navigation
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}
