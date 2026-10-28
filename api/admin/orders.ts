import type { Request, Response } from 'express';
import {
  ApiError,
  listAllOrdersForAdmin,
  updateOrderStatusByAdmin,
  verifyAdminBearerToken,
} from '../../src/server/orderService.ts';

export default async function handler(req: Request, res: Response) {
  try {
    const authHeader =
      typeof req.header === 'function'
        ? req.header('Authorization')
        : (req.headers.authorization as string | undefined);
    const admin = await verifyAdminBearerToken(authHeader);

    if (req.method === 'GET') {
      const ordersList = await listAllOrdersForAdmin();
      return res.status(200).json({
        orders: ordersList,
        adminEmail: admin.email,
      });
    }

    if (req.method === 'PATCH') {
      const bodyObj =
        req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
      const orderId = String(
        (req.params && req.params.orderId) ||
          (req.query && (req.query.orderId as string | undefined)) ||
          bodyObj.orderId ||
          ''
      ).trim();

      const updated = await updateOrderStatusByAdmin(orderId, bodyObj.status);
      return res.status(200).json({
        order: updated,
        updatedBy: admin.email,
      });
    }

    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Metode HTTP tidak diizinkan.',
      },
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
