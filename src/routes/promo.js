const router = require('express').Router();
const c = require('../controllers/promoController');
const wrap = require('../utils/wrap');

router.get('/slides', wrap(c.publicSlides));
router.get('/settings', wrap(c.publicSettings));
router.get('/ads', wrap(c.publicAds));

module.exports = router;
