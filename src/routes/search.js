const router = require('express').Router();
const c = require('../controllers/searchController');

router.get('/', c.search);
router.get('/suggested', c.suggested);

module.exports = router;
