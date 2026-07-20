import sanitizeHtml from 'sanitize-html';

// Allowlist for advertiser-supplied HTML snippets. Kept deliberately restrictive:
// no scripts, no inline event handlers, no iframes. Ads may use simple formatting,
// links and images only. All URLs are forced to http/https and links get safe rel.
const AD_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'a',
    'b',
    'br',
    'div',
    'em',
    'h3',
    'h4',
    'i',
    'img',
    'p',
    'span',
    'strong',
    'u',
    'ul',
    'ol',
    'li',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    '*': ['style', 'class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    img: (tagName, attribs) => {
      const src = attribs.src ?? '';
      // Block data: URIs to avoid obfuscated script payloads.
      if (!/^https?:\/\//i.test(src)) {
        return { tagName, attribs: { ...attribs, src: '' } };
      }
      return { tagName, attribs: { ...attribs, loading: 'lazy' } };
    },
  },
};

export function sanitizeAdHtml(dirty: string): string {
  return sanitizeHtml(dirty, AD_HTML_OPTIONS);
}
