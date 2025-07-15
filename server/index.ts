import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pmScheduler } from "./services/pm-scheduler";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize the app
async function initializeApp() {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Server Error:', err);
    }

    res.status(status).json({ message });
    
    // Don't throw in test environment to avoid test failures
    if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
      throw err;
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  return server;
}

// Initialize app for testing
if (process.env.NODE_ENV === 'test') {
  initializeApp().catch(console.error);
}

// Export app for testing
export { app };

// Only run server if this file is being executed directly
if (require.main === module || process.env.NODE_ENV === 'development') {
  (async () => {
    const server = await initializeApp();
    
    // Serve the app on configured port (default 5000)
    const port = process.env.PORT || 5000;
    server.listen({
      port: Number(port),
      host: process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost",
    }, () => {
      log(`serving on port ${port}`);
      
      // Start PM scheduler after server is running
      pmScheduler.start();
    });
  })();
}
