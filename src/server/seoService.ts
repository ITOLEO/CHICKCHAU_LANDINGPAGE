import {
  BRAND_NAME,
  BRAND_TAGLINE,
  HOMEPAGE_DESCRIPTION,
  HOMEPAGE_OG_DESCRIPTION,
  HOMEPAGE_TWITTER_DESCRIPTION,
  HOMEPAGE_TITLE,
  CART_TITLE,
  CART_DESCRIPTION,
  DEFAULT_PRODUCTION_SITE_URL,
  OG_IMAGE_PATH,
  OG_IMAGE_TYPE,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_ALT,
  LOGO_PATH,
  normalizeProductionSiteUrl,
  normalizeGoogleSiteVerification,
  normalizeGa4MeasurementId,
} from '../config/siteConfig.ts';

export function getProductionSiteOrigin(): string | null {
  return (
    normalizeProductionSiteUrl(process.env.SITE_URL || process.env.VITE_SITE_URL) ||
    DEFAULT_PRODUCTION_SITE_URL
  );
}

export function getGoogleSiteVerificationToken(): string | null {
  return normalizeGoogleSiteVerification(
    process.env.GOOGLE_SITE_VERIFICATION || process.env.VITE_GOOGLE_SITE_VERIFICATION
  );
}

export function getGa4MeasurementId(): string | null {
  return normalizeGa4MeasurementId(
    process.env.GA4_MEASUREMENT_ID || process.env.VITE_GA4_MEASUREMENT_ID
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildRobotsTxt(siteOrigin: string | null): string {
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
  ];
  if (siteOrigin) {
    lines.push('');
    lines.push(`Sitemap: ${siteOrigin}/sitemap.xml`);
  }
  return lines.join('\n') + '\n';
}

export function buildSitemapXml(siteOrigin: string | null): string {
  const urlsXml = siteOrigin
    ? `  <url>\n    <loc>${escapeXml(`${siteOrigin}/`)}</loc>\n  </url>\n`
    : '';

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urlsXml +
    `</urlset>\n`
  );
}

export function injectRouteSeoMetadata(rawHtml: string, requestPath: string): string {
  const normalizedPath = requestPath === '/cart' || requestPath.startsWith('/cart?') ? '/cart' : '/';
  const isCart = normalizedPath === '/cart';

  const siteOrigin = getProductionSiteOrigin() || DEFAULT_PRODUCTION_SITE_URL;
  const gscVerification = getGoogleSiteVerificationToken();

  const title = isCart ? CART_TITLE : HOMEPAGE_TITLE;
  const description = isCart ? CART_DESCRIPTION : HOMEPAGE_DESCRIPTION;
  const ogDescription = isCart ? CART_DESCRIPTION : HOMEPAGE_OG_DESCRIPTION;
  const twitterDescription = isCart ? CART_DESCRIPTION : HOMEPAGE_TWITTER_DESCRIPTION;
  const robotsContent = isCart ? 'noindex, nofollow' : 'index, follow';

  const canonicalUrl = !isCart ? `${siteOrigin}/` : null;
  const ogImageUrl = `${siteOrigin}${OG_IMAGE_PATH}`;

  const headTags: string[] = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  ];

  if (canonicalUrl) {
    headTags.push(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
  }

  headTags.push(
    `<meta name="robots" content="${robotsContent}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(BRAND_NAME)}" />`,
    `<meta property="og:locale" content="id_ID" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(ogDescription)}" />`
  );

  if (canonicalUrl) {
    headTags.push(`<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);
  }

  headTags.push(
    `<meta property="og:image" content="${escapeHtml(ogImageUrl)}" />`,
    `<meta property="og:image:secure_url" content="${escapeHtml(ogImageUrl)}" />`,
    `<meta property="og:image:type" content="${escapeHtml(OG_IMAGE_TYPE)}" />`,
    `<meta property="og:image:width" content="${escapeHtml(OG_IMAGE_WIDTH)}" />`,
    `<meta property="og:image:height" content="${escapeHtml(OG_IMAGE_HEIGHT)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(OG_IMAGE_ALT)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(twitterDescription)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />`
  );

  if (gscVerification) {
    headTags.push(
      `<meta name="google-site-verification" content="${escapeHtml(gscVerification)}" />`
    );
  }

  if (!isCart && siteOrigin) {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${siteOrigin}/#organization`,
          name: BRAND_NAME,
          url: `${siteOrigin}/`,
          logo: `${siteOrigin}${LOGO_PATH}`,
          description: HOMEPAGE_DESCRIPTION,
        },
        {
          '@type': 'WebSite',
          '@id': `${siteOrigin}/#website`,
          url: `${siteOrigin}/`,
          name: BRAND_NAME,
          alternateName: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
          description: HOMEPAGE_DESCRIPTION,
          inLanguage: 'id-ID',
          publisher: {
            '@id': `${siteOrigin}/#organization`,
          },
        },
      ],
    };
    headTags.push(
      `<script id="chickchau-jsonld" type="application/ld+json">${JSON.stringify(jsonLd)}</script>`
    );
  }

  return rawHtml.replace(
    /<!--\s*SEO_HEAD_START\s*-->[\s\S]*?<!--\s*SEO_HEAD_END\s*-->/i,
    `<!-- SEO_HEAD_START -->\n    ${headTags.join('\n    ')}\n    <!-- SEO_HEAD_END -->`
  );
}
