const router = require('express').Router();
const c = require('../controllers/seoController');
const wrap = require('../utils/wrap');

router.get('/sitemap', wrap(c.sitemapEntries));
router.get('/profile/:slug', wrap(c.profileExists));

module.exports = router;
