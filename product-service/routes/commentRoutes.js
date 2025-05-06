const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

router.post('/', commentController.createComment);
router.get('/', commentController.getComments);
router.get('/:productId', commentController.getCommentsByProductId);

module.exports = router;
