const BusinessProfile = require('../models/BusinessProfile');

// Sitemap builders and crawlers need two facts per profile and nothing else. Owner names,
// phone numbers and emails stay out of this response on purpose.
const SITEMAP_CAP = 50000;

exports.sitemapEntries = async (req, res) => {
  const profiles = await BusinessProfile.find({ status: 'active' })
    .select('pageSlug updatedAt')
    .sort({ updatedAt: -1 })
    .limit(SITEMAP_CAP)
    .lean();

  res.set('Cache-Control', 'public, max-age=600');
  res.json({
    count: profiles.length,
    profiles: profiles.map((p) => ({ slug: p.pageSlug, lastmod: p.updatedAt })),
  });
};

// Lets the edge layer answer "does this business page exist?" without shipping the
// whole profile document to a crawler.
exports.profileExists = async (req, res) => {
  const slug = String(req.params.slug || '').trim();
  const found = slug ? await BusinessProfile.exists({ pageSlug: slug, status: 'active' }) : null;
  res.set('Cache-Control', 'public, max-age=300');
  res.status(found ? 200 : 404).json({ exists: Boolean(found) });
};
