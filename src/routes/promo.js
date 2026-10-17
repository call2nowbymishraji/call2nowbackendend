const router = require('express').Router();
const c = require('../controllers/promoController');

router.get('/slides', c.publicSlides);
router.get('/settings', c.publicSettings);
router.get('/ads', c.publicAds);

module.exports = router;
