const router = require('express').Router();
const c = require('../controllers/profileController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const wrap = require('../utils/wrap');
const { objectIdParam } = require('../middleware/params');

router.param('id', objectIdParam);

router.post('/', protect, upload.any(), wrap(c.create));
router.put('/:id', protect, upload.any(), wrap(c.update));
router.get('/mine', protect, wrap(c.mine));
router.get('/slug/:slug', wrap(c.bySlug));

module.exports = router;
