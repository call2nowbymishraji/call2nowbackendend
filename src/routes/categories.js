const router = require('express').Router();
const c = require('../controllers/categoryController');
const wrap = require('../utils/wrap');
const { objectIdParam } = require('../middleware/params');

router.param('id', objectIdParam);

router.get('/', wrap(c.list));

module.exports = router;
