const router = require('express').Router();
const c = require('../controllers/categoryController');

router.get('/', c.list);

module.exports = router;
