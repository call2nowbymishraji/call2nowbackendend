const router = require('express').Router();
const c = require('../controllers/searchController');
const wrap = require('../utils/wrap');

router.get('/', wrap(c.search));
router.get('/suggested', wrap(c.suggested));

module.exports = router;
