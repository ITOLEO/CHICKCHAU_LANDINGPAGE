import {
  SEO_DEFAULTS,
  normalizeProductionSiteUrl,
  normalizeGoogleSiteVerification
} from '../config/siteConfig';

function upsertMetaTag(
  selector: string,
  attrName: 'name' | 'property',
  attrValue: string,
  content: string
): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeElements(selector: string): void {
  if (typeof document === 'undefined') return;
  const nodes = document.head.querySelectorAll(selector);
  nodes.forEach(node => node.parentNode?.removeChild(node));
}

export function buildStructuredDataJsonLd(productionOrigin: string): string {
  const payload = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${productionOrigin}/#organization`,
        name: SEO_DEFAULTS.siteName,
        url: `${productionOrigin}/`,
        logo: {
          '@type': 'ImageObject',
          url: `${productionOrigin}/logo.png`
        },
        description: SEO_DEFAULTS.description
      },
      {
        '@type': 'WebSite',
        '@id': `${productionOrigin}/#website`,
        url: `${productionOrigin}/`,
        name: SEO_DEFAULTS.siteName,
        description: SEO_DEFAULTS.description,
        inLanguage: 'id-ID',
        publisher: {
          '@id': `${productionOrigin}/#organization`
        }
      }
    ]
  };
  return JSON.stringify(payload);
}

export function syncRouteSeo(route: 'home' | 'cart'): void {
  if (typeof document === 'undefined') return;

  const rawSiteUrl = (import.meta.env.VITE_SITE_URL as string | undefined) || '';
  const rawGscToken =
    (import.meta.env.VITE_GOOGLE_SITE_VERIFICATION as string | undefined) || '';

  const productionOrigin = normalizeProductionSiteUrl(rawSiteUrl);
  const gscToken = normalizeGoogleSiteVerification(rawGscToken);

  document.documentElement.lang = SEO_DEFAULTS.language;

  const pageTitle = route === 'home' ? SEO_DEFAULTS.homeTitle : SEO_DEFAULTS.cartTitle;
  document.title = pageTitle;

  upsertMetaTag(
    'meta[name="description"]',
    'name',
    'description',
    SEO_DEFAULTS.description
  );
  upsertMetaTag('meta[property="og:type"]', 'property', 'og:type', 'website');
  upsertMetaTag(
    'meta[property="og:site_name"]',
    'property',
    'og:site_name',
    SEO_DEFAULTS.siteName
  );
  upsertMetaTag('meta[property="og:locale"]', 'property', 'og:locale', SEO_DEFAULTS.locale);
  upsertMetaTag('meta[property="og:title"]', 'property', 'og:title', pageTitle);
  upsertMetaTag(
    'meta[property="og:description"]',
    'property',
    'og:description',
    SEO_DEFAULTS.description
  );
  upsertMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
  upsertMetaTag(
    'meta[name="twitter:description"]',
    'name',
    'twitter:description',
    SEO_DEFAULTS.description
  );

  if (gscToken) {
    upsertMetaTag(
      'meta[name="google-site-verification"]',
      'name',
      'google-site-verification',
      gscToken
    );
  } else {
    removeElements('meta[name="google-site-verification"]');
  }

  // Deduplicate any existing canonical link tags before applying route-specific rules
  const existingCanonicals = document.head.querySelectorAll<HTMLLinkElement>(
    'link[rel="canonical"]'
  );
  if (existingCanonicals.length > 1) {
    existingCanonicals.forEach((node, idx) => {
      if (idx > 0) node.parentNode?.removeChild(node);
    });
  }

  if (route === 'cart') {
    upsertMetaTag('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow');
    removeElements('link[rel="canonical"]');
    removeElements('meta[property="og:url"]');
    removeElements('script#chickchau-jsonld');
  } else {
    upsertMetaTag('meta[name="robots"]', 'name', 'robots', 'index, follow');

    if (productionOrigin) {
      const canonicalHref = `${productionOrigin}/`;
      const ogImageHref = `${productionOrigin}${SEO_DEFAULTS.ogImagePath}`;

      let canonicalEl = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute('href', canonicalHref);

      upsertMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalHref);
      upsertMetaTag('meta[property="og:image"]', 'property', 'og:image', ogImageHref);
      upsertMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', ogImageHref);

      let jsonLdEl = document.head.querySelector<HTMLScriptElement>('script#chickchau-jsonld');
      if (!jsonLdEl) {
        jsonLdEl = document.createElement('script');
        jsonLdEl.id = 'chickchau-jsonld';
        jsonLdEl.type = 'application/ld+json';
        document.head.appendChild(jsonLdEl);
      }
      jsonLdEl.textContent = buildStructuredDataJsonLd(productionOrigin);
    } else {
      // Never leak placeholder domains or preview hostnames into canonical or structured data
      removeElements('link[rel="canonical"]');
      removeElements('meta[property="og:url"]');
      removeElements('script#chickchau-jsonld');
    }
  }
}
