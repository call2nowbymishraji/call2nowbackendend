const router = require('express').Router();
const c = require('../controllers/adminController');
const cat = require('../controllers/categoryController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const wrap = require('../utils/wrap');
const { objectIdParam } = require('../middleware/params');

router.use(protect, adminOnly);

router.param('id', objectIdParam);
router.param('productId', objectIdParam);

router.get('/profiles', wrap(c.listProfiles));
router.put('/profiles/:id/tenure', wrap(c.setTenure));
router.put('/profiles/:id/verified', wrap(c.setVerified));
router.put('/profiles/:id/suggested', wrap(c.setSuggested));
router.delete('/profiles/:id', wrap(c.deleteProfile));
router.delete('/profiles/:id/products/:productId', wrap(c.removeProduct));
router.get('/slides', wrap(c.listSlides));
router.post('/slides', upload.single('image'), wrap(c.createSlide));
router.put('/slides/:id', wrap(c.updateSlide));
router.delete('/slides/:id', wrap(c.deleteSlide));
router.get('/settings', wrap(c.getSettings));
router.put('/settings', wrap(c.setSettings));
router.get('/ads', wrap(c.listAds));
router.post('/ads', upload.single('image'), wrap(c.createAd));
router.put('/ads/:id', wrap(c.toggleAd));
router.delete('/ads/:id', wrap(c.deleteAd));
router.get('/categories', wrap(cat.adminList));
router.post('/categories', wrap(cat.create));
router.put('/categories/:id', wrap(cat.rename));
router.delete('/categories/:id', wrap(cat.remove));

module.exports = router;
