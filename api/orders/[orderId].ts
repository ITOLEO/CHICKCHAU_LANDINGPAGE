import type { Request, Response } from 'express';
import {
  ApiError,
  getOrderByIdForCustomer,
  markOrderWhatsAppOpened,
} from '../../src/server/orderService.ts';

export default async function handler(req: Request, res: Response) {
  try {
    const rawOrderId =
      (req.params && req.params.orderId) ||
      (req.query && (req.query.orderId as string | undefined)) ||
      '';
    const orderId = String(rawOrderId).trim();

    const headerKey =
      typeof req.header === 'function'
        ? req.header('X-Idempotency-Key')
        : (req.headers['x-idempotency-key'] as string | undefined);
    const bodyKey =
      req.body && typeof req.body === 'object'
        ? (req.body as Record<string, unknown>).idempotencyKey
        : undefined;
    const callerKey =
      headerKey || (typeof bodyKey === 'string' ? bodyKey : undefined) || undefined;

    if (req.method === 'GET') {
      const orderSummary = await getOrderByIdForCustomer(orderId, callerKey);
      return res.status(200).json({ order: orderSummary });
    }

    if (req.method === 'POST') {
      const updated = await markOrderWhatsAppOpened(orderId, callerKey);
      return res.status(200).json({ order: updated });
    }

    res.setHeader('Allow', 'GET, POST');
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
