import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import healthHandler from './api/health.ts';
import catalogHandler from './api/catalog.ts';
import ordersIndexHandler from './api/orders/index.ts';
import orderByIdHandler from './api/orders/[orderId].ts';
import adminOrdersHandler from './api/admin/orders.ts';
import adminCatalogHandler from './api/admin/catalog.ts';
import robotsHandler from './api/robots.ts';
import sitemapHandler from './api/sitemap.ts';
import { ApiError } from './src/server/orderService.ts';
import { injectRouteSeoMetadata } from './src/server/seoService.ts';

dotenv.config();

const PORT = 3000;

export async function createAppServer(options: { isProduction?: boolean } = {}) {
  const isProd = options.isProduction ?? process.env.NODE_ENV === 'production';
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  // 1. Health & Diagnostic Endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    healthHandler(req, res);
  });

  // 2. Authoritative Product Catalog Endpoint
  app.get('/api/catalog', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await catalogHandler(req, res);
    } catch (err) {
      next(err);
    }
  });

  // 3. Create Order Endpoint (POST /api/orders)
  app.post('/api/orders', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ordersIndexHandler(req, res);
    } catch (err) {
      next(err);
    }
  });

  // 4. Get Single Order Endpoint (GET /api/orders/:orderId)
  app.get('/api/orders/:orderId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await orderByIdHandler(req, res);
    } catch (err) {
      next(err);
    }
  });

  // 5. Mark WhatsApp Handoff Opened (POST /api/orders/:orderId/whatsapp-opened)
  app.post(
    '/api/orders/:orderId/whatsapp-opened',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await orderByIdHandler(req, res);
      } catch (err) {
        next(err);
      }
    }
  );

  // 6. Admin Endpoints
  app.get('/api/admin/orders', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await adminOrdersHandler(req, res);
    } catch (err) {
      next(err);
    }
  });

  app.patch(
    '/api/admin/orders/:orderId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await adminOrdersHandler(req, res);
      } catch (err) {
        next(err);
      }
    }
  );

  app.patch(
    '/api/admin/catalog/:productId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await adminCatalogHandler(req, res);
      } catch (err) {
        next(err);
      }
    }
  );

  // Catch-all for unknown /api/* routes so they never fall through to SPA HTML
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'API_NOT_FOUND',
        message: 'Endpoint API tidak ditemukan.',
      },
    });
  });

  // 7. Dynamic /robots.txt, /sitemap.xml, and /assets/og-images alias
  app.get('/robots.txt', (req: Request, res: Response) => {
    robotsHandler(req, res);
  });

  app.get('/sitemap.xml', (req: Request, res: Response) => {
    sitemapHandler(req, res);
  });

  app.get(['/og-image-v2.jpg', '/og-image.jpg', '/assets/og-images', '/assets/og-images.png'], (_req: Request, res: Response) => {
    const prodImgPath = path.resolve(process.cwd(), 'dist/og-image-v2.jpg');
    const publicImgPath = path.resolve(process.cwd(), 'public/og-image-v2.jpg');
    const targetPath = isProd && fs.existsSync(prodImgPath) ? prodImgPath : publicImgPath;
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(targetPath);
  });

  // 8. Frontend Serving (Vite Middleware in Dev, Static dist/ in Production)
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.get('*', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const url = req.originalUrl || '/';
        const pathname = url.split('?')[0] || '/';
        const templatePath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        const finalHtml = injectRouteSeoMetadata(template, pathname);

        if (pathname === '/cart') {
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        }

        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(finalHtml);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));

    app.get('*', (req: Request, res: Response) => {
      const pathname = (req.originalUrl || '/').split('?')[0] || '/';
      const indexHtmlPath = path.join(distPath, 'index.html');
      const rawHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
      const finalHtml = injectRouteSeoMetadata(rawHtml, pathname);

      if (pathname === '/cart') {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      }

      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(finalHtml);
    });
  }

  // 9. Structured Error Handler (Never leaks stack traces or credentials)
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
      return;
    }

    if (
      err &&
      typeof err === 'object' &&
      'type' in err &&
      (err as { type?: string }).type === 'entity.too.large'
    ) {
      res.status(413).json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Ukuran data pesanan melebihi batas maksimum yang diizinkan.',
        },
      });
      return;
    }

    if (err instanceof SyntaxError && 'status' in err) {
      res.status(400).json({
        error: {
          code: 'INVALID_JSON',
          message: 'Format JSON tidak valid.',
        },
      });
      return;
    }

    console.error('Unhandled server error:', err instanceof Error ? err.message : String(err));
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Terjadi kesalahan internal pada server. Silakan coba beberapa saat lagi.',
      },
    });
  });

  return app;
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(process.cwd(), 'server.ts');

if (isDirectExecution) {
  createAppServer()
    .then((app) => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`CHICKCHAU server listening on http://0.0.0.0:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start CHICKCHAU server:', err);
      process.exit(1);
    });
}
