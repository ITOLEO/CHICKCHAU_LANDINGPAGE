import type { Request, Response } from 'express';
import {
  WHATSAPP_BASE_URL,
  WHATSAPP_DISPLAY_NUMBER,
  WHATSAPP_INTERNATIONAL_NUMBER,
} from '../src/config/siteConfig.ts';
import { getDatabaseDiagnostics } from '../src/server/orderService.ts';
import {
  getGa4MeasurementId,
  getGoogleSiteVerificationToken,
  getProductionSiteOrigin,
} from '../src/server/seoService.ts';

export default function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Metode HTTP tidak diizinkan.',
      },
    });
  }

  const productionOrigin = getProductionSiteOrigin();
  const gscToken = getGoogleSiteVerificationToken();
  const ga4Id = getGa4MeasurementId();
  const dbDiagnostics = getDatabaseDiagnostics();

  return res.status(200).json({
    status: 'ok',
    whatsappDestination: {
      display: WHATSAPP_DISPLAY_NUMBER,
      international: WHATSAPP_INTERNATIONAL_NUMBER,
      baseUrl: WHATSAPP_BASE_URL,
    },
    database: dbDiagnostics,
    diagnostics: {
      productionSiteUrlConfigured: Boolean(productionOrigin),
      productionSiteOrigin: productionOrigin,
      googleSiteVerificationConfigured: Boolean(gscToken),
      ga4MeasurementIdConfigured: Boolean(ga4Id),
    },
  });
}
