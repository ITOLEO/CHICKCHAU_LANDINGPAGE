import type { Request, Response } from 'express';
import {
  ApiError,
  getAuthoritativeCatalog,
  updateCatalogPriceByAdmin,
  verifyAdminBearerToken,
} from '../../src/server/orderService.ts';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Metode HTTP tidak diizinkan.',
      },
    });
  }

  try {
    const authHeader =
      typeof req.header === 'function'
        ? req.header('Authorization')
        : (req.headers.authorization as string | undefined);
    const admin = await verifyAdminBearerToken(authHeader);

    const bodyObj =
      req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    const productId = String(
      (req.params && req.params.productId) ||
        (req.query && (req.query.productId as string | undefined)) ||
        bodyObj.productId ||
        ''
    ).trim();

    const updatedProduct = await updateCatalogPriceByAdmin(
      productId,
      bodyObj.unitPrice,
      bodyObj.available,
      admin
    );
    const catalog = await getAuthoritativeCatalog();

    return res.status(200).json({
      product: updatedProduct,
      catalog,
      updatedBy: admin.email,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Terjadi kesalahan internal pada server.',
      },
    });
  }
}
