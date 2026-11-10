import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Backend Health & Info APIs
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      app: 'DineFlow Restaurant Management System',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      timestamp: new Date().toISOString(),
    });
  });

  if (!isProduction) {
    // Mount Vite dev server middleware
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: !disableHmr,
        watch: disableHmr ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DineFlow Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
