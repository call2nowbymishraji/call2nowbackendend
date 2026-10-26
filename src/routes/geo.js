const router = require('express').Router();
const g = require('../controllers/geoController');

router.get('/countries', g.countries);
router.get('/states', g.states);
router.get('/cities', g.cities);
router.get('/all-cities', g.allCities);

module.exports = router;
