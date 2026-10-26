const router = require('express').Router();
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const wrap = require('../utils/wrap');

router.post('/signup', wrap(c.signup));
router.post('/otp/resend', wrap(c.resendOtp));
router.post('/signup/verify', wrap(c.verifySignup));
router.post('/login', wrap(c.login));
router.post('/google', wrap(c.google));
router.get('/me', protect, wrap(c.me));
router.post('/forgot/request', wrap(c.forgotRequest));
router.post('/forgot/verify', wrap(c.forgotVerify));
router.post('/forgot/reset', wrap(c.forgotReset));

module.exports = router;
