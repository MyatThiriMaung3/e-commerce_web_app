const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');

router.post('/', ratingController.createRating);
router.get('/', ratingController.getRatings);
router.get('/:productId', ratingController.getRatingsByProductId);

module.exports = router;