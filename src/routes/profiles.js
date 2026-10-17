const router = require('express').Router();
const c = require('../controllers/profileController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', protect, upload.any(), c.create);
router.put('/:id', protect, upload.any(), c.update);
router.get('/mine', protect, c.mine);
router.get('/slug/:slug', c.bySlug);

module.exports = router;
