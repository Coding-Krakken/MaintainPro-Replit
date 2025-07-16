const express = require("express");
import { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

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
  try {
    console.log('Starting server initialization...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Port:', process.env.PORT || 5000);
    
    const server = await registerRoutes(app);
    console.log('Routes registered successfully');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log error in all environments for debugging
      console.error('Server Error:', err);

      res.status(status).json({ message });
      
      // Don't throw in test environment to avoid test failures
      if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
        // Log but don't throw in production to keep server running
        console.error('Production error (not throwing):', err);
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      console.log('Setting up Vite for development...');
      await setupVite(app, server);
    } else {
      console.log('Setting up static file serving for production...');
      serveStatic(app);
    }

    console.log('Server initialization completed successfully');
    return server;
  } catch (error) {
    console.error('Failed to initialize server:', error);
    throw error;
  }
}

// Initialize app for testing
if (process.env.NODE_ENV === 'test') {
  initializeApp().catch(console.error);
}

// Export app for testing
export { app };

// Only run server if this file is being executed directly
// Check if this is the main module being executed
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                    process.env.NODE_ENV === 'development' ||
                    process.env.NODE_ENV === 'production';

if (isMainModule && process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      console.log('Starting server...');
      const server = await initializeApp();
      
      // Serve the app on configured port (default 5000)
      const port = process.env.PORT || 5000;
      server.listen({
        port: Number(port),
        host: process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost",
      }, () => {
        log(`serving on port ${port}`);
        console.log(`Server is running on http://${process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost"}:${port}`);
        
        // Start PM scheduler after server is running (optional)
        (async () => {
          try {
            const pmSchedulerModule = await import("./services/pm-scheduler");
            pmSchedulerModule.pmScheduler.start();
            console.log('PM Scheduler started successfully');
          } catch (schedulerError) {
            console.error('Failed to start PM scheduler:', schedulerError);
            // Don't fail the server startup if scheduler fails
          }
        })();
      });

      // Handle server errors
      server.on('error', (error) => {
        console.error('Server error:', error);
      });

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  })();
}
