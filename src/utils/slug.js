const slugify = (text = '') =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function uniqueSlug(Model, base) {
  const root = slugify(base) || 'business';
  let slug = root;
  let i = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Model.findOne({ pageSlug: slug })) {
    i += 1;
    slug = `${root}-${i}`;
  }
  return slug;
}

module.exports = { slugify, uniqueSlug };
