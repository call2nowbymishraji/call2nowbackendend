const router = require('express').Router();
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/signup', c.signup);
router.post('/otp/resend', c.resendOtp);
router.post('/signup/verify', c.verifySignup);
router.post('/login', c.login);
router.post('/google', c.google);
router.get('/me', protect, c.me);
router.post('/forgot/request', c.forgotRequest);
router.post('/forgot/verify', c.forgotVerify);
router.post('/forgot/reset', c.forgotReset);

module.exports = router;
