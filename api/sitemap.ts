import type { Request, Response } from 'express';
import { buildSitemapXml, getProductionSiteOrigin } from '../src/server/seoService.ts';

export default function handler(req: Request, res: Response) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }

  const siteOrigin = getProductionSiteOrigin();
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).send(buildSitemapXml(siteOrigin));
}
