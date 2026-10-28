import type { Request, Response } from 'express';
import { ApiError, createAuthoritativeOrder } from '../../src/server/orderService.ts';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Metode HTTP tidak diizinkan.',
      },
    });
  }

  try {
    const headerIdempotencyKey =
      (typeof req.header === 'function'
        ? req.header('X-Idempotency-Key')
        : (req.headers['x-idempotency-key'] as string | undefined)) || undefined;

    const bodyObj =
      req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    const idempotencyKey = headerIdempotencyKey || bodyObj.idempotencyKey;

    const { order, idempotentReplay } = await createAuthoritativeOrder({
      ...bodyObj,
      idempotencyKey,
    });

    return res.status(idempotentReplay ? 200 : 201).json({
      order,
      idempotentReplay,
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
