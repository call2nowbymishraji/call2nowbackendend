const router = require('express').Router();
const c = require('../controllers/adminController');
const cat = require('../controllers/categoryController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect, adminOnly);

router.get('/profiles', c.listProfiles);
router.put('/profiles/:id/tenure', c.setTenure);
router.put('/profiles/:id/verified', c.setVerified);
router.put('/profiles/:id/suggested', c.setSuggested);
router.delete('/profiles/:id', c.deleteProfile);
router.delete('/profiles/:id/products/:productId', c.removeProduct);
router.get('/slides', c.listSlides);
router.post('/slides', upload.single('image'), c.createSlide);
router.put('/slides/:id', c.updateSlide);
router.delete('/slides/:id', c.deleteSlide);
router.get('/settings', c.getSettings);
router.put('/settings', c.setSettings);
router.get('/ads', c.listAds);
router.post('/ads', upload.single('image'), c.createAd);
router.put('/ads/:id', c.toggleAd);
router.delete('/ads/:id', c.deleteAd);
router.get('/categories', cat.adminList);
router.post('/categories', cat.create);
router.put('/categories/:id', cat.rename);
router.delete('/categories/:id', cat.remove);

module.exports = router;
