const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/', orderController.createOrder);
router.get('/sort/filter', orderController.getOrdersFilterSort);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);
router.get('/user/:userId', orderController.getOrdersByUserId);
router.put('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);

router.get('/total/all-order', orderController.getAllOrderStats);
router.get('/total/new-order', orderController.getOrderStatsByDate);

router.get('/sales/best-selling', orderController.getTopSellingProducts);
router.get('/stats/weekly-order', orderController.getWeeklyOrderStats);

module.exports = router;