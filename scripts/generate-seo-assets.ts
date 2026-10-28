import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import {
  buildRobotsTxt,
  buildSitemapXml,
  getProductionSiteOrigin,
  injectRouteSeoMetadata,
} from '../src/server/seoService.ts';

dotenv.config();

function generateStaticSeoFiles() {
  const siteOrigin = getProductionSiteOrigin();
  const distDir = path.resolve(process.cwd(), 'dist');

  if (!fs.existsSync(distDir)) {
    console.log('dist/ directory not found; skipping post-build static SEO generation.');
    return;
  }

  // 1. Write dist/robots.txt and dist/sitemap.xml
  const robotsContent = buildRobotsTxt(siteOrigin);
  const sitemapContent = buildSitemapXml(siteOrigin);

  fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsContent, 'utf-8');
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapContent, 'utf-8');

  // 2. Pre-render initial HTML metadata for / (dist/index.html) and /cart (dist/cart/index.html)
  const indexHtmlPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    const rawHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
    const homeHtml = injectRouteSeoMetadata(rawHtml, '/');
    const cartHtml = injectRouteSeoMetadata(rawHtml, '/cart');

    fs.writeFileSync(indexHtmlPath, homeHtml, 'utf-8');

    const cartDir = path.join(distDir, 'cart');
    fs.mkdirSync(cartDir, { recursive: true });
    fs.writeFileSync(path.join(cartDir, 'index.html'), cartHtml, 'utf-8');
  }

  console.log(
    `Generated static SEO files in dist/ (SITE_URL=${siteOrigin || 'unconfigured — canonical/sitemap loc withheld'})`
  );
}

generateStaticSeoFiles();
