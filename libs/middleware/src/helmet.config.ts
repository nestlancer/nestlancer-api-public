export function getHelmetConfig() {
  return {
    // JSON API responses do not render HTML; strict CSP without unsafe-inline.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
      },
    },
    // API is called from app/admin/landing origins — same-origin CORP blocks those fetches.
    crossOriginResourcePolicy: { policy: 'cross-origin' as const },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  };
}
