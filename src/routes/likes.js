const router = require('express').Router();
const c = require('../controllers/likeController');
const wrap = require('../utils/wrap');

router.post('/', wrap(c.like));

module.exports = router;
