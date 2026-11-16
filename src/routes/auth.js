const router = require('express').Router();
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const wrap = require('../utils/wrap');

router.post('/signup/phone', wrap(c.signupPhone));
router.post('/login', wrap(c.login));
router.post('/login/phone', wrap(c.loginPhone));
router.post('/google', wrap(c.google));
router.get('/me', protect, wrap(c.me));

module.exports = router;
