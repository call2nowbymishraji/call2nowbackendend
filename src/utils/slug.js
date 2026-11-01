const slugify = (text = '') =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Business pages are served at /<slug>, so a shop name that slugifies to an app route or to
// one of the built files would take over that page. Mirrors RESERVED_SEGMENTS in the
// frontend's src/seo/site.js, which is the copy used by the build steps.
const RESERVED_SLUGS = new Set([
  'login',
  'signup',
  'search',
  'create-profile',
  'profile',
  'admin',
  'privacy',
  'terms',
  'b',
  'index.html',
  '404.html',
  'favicon.png',
  'logo.png',
  'og-cover.png',
  'robots.txt',
  'upi-qr.png',
  'sitemap.xml',
  'sitemap-index.xml',
  'assets',
  '_redirects',
  '.netlify',
  '.well-known',
]);

const candidate = (root, i) => (i === 1 ? root : `${root}-${i}`);

async function uniqueSlug(Model, base) {
  const root = slugify(base) || 'business';
  let i = 1;
  let slug = candidate(root, i);
  // A reserved name is skipped exactly like a taken one, so a shop called "Search" becomes
  // search-2 rather than the search page.
  // eslint-disable-next-line no-await-in-loop
  while (RESERVED_SLUGS.has(slug) || (await Model.findOne({ pageSlug: slug }))) {
    i += 1;
    slug = candidate(root, i);
  }
  return slug;
}

module.exports = { slugify, uniqueSlug, RESERVED_SLUGS };
