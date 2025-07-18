import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pmScheduler } from "./services/pm-scheduler";
import { backgroundJobScheduler } from "./services/background-jobs";

const app = express();

// Security middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  // HTTPS redirect in production
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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

// Start PM scheduler
pmScheduler.start();

// Start background job scheduler
backgroundJobScheduler.startAll();

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
  if (process.env.NODE_ENV === "development") {
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
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    const server = await initializeApp();
    // Log all environment variables for debugging
    console.log('ENVIRONMENT VARIABLES:', JSON.stringify(process.env, null, 2));
    // Serve the app on configured port (default 5000)
    const port = process.env.PORT || 5000;
    console.log('About to start server on port', port);
    const httpServer = server.listen({
      port: Number(port),
      host: process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost",
    }, () => {
      log(`serving on port ${port}`);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      log('SIGTERM received, shutting down gracefully');
      backgroundJobScheduler.stopAll();
      httpServer.close(() => {
        log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      log('SIGINT received, shutting down gracefully');
      backgroundJobScheduler.stopAll();
      httpServer.close(() => {
        log('HTTP server closed');
        process.exit(0);
      });
    });
  })();
}
