const Order = require('../models/orderModel');

exports.createOrder = async (req, res) => {
    try {
        const order = new Order(req.body);
        const savedOrder = await order.save();
        res.status(201).json(savedOrder);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find();
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /orders/user/:userId
exports.getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ userId });

    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.status(200).json(order);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.status(200).json({ message: 'Order deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.getOrdersFilterSort = async (req, res) => {
  try {
    let {
      sort_by = 'created',
      order = 'desc',
      page = 1,
      limit = 20,
      dateFilter = '',
      startDate,
      endDate,
      userId,
      discountId
    } = req.query;

    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (page - 1) * limit;

    const sortFieldMap = {
      created: 'createdAt'
    };
    const sortField = sortFieldMap[sort_by] || 'createdAt';

    let dateRange = {};
    const now = new Date();

    switch (dateFilter) {
      case 'today': {
        const start = new Date(now.setHours(0, 0, 0, 0));
        const end = new Date(now.setHours(23, 59, 59, 999));
        dateRange = { $gte: start, $lte: end };
        break;
      }
      case 'yesterday': {
        const start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        dateRange = { $gte: start, $lte: end };
        break;
      }
      case 'this_week': {
        const start = new Date();
        start.setDate(start.getDate() - start.getDay()); // Sunday
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        dateRange = { $gte: start, $lte: end };
        break;
      }
      case 'this_month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        dateRange = { $gte: start, $lte: end };
        break;
      }
      case 'this_year': {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        dateRange = { $gte: start, $lte: end };
        break;
      }
      case 'custom': {
        if (!startDate || !endDate) {
          return res.status(400).json({ error: 'Custom date filter requires startDate and endDate' });
        }
        dateRange = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
        break;
      }
    }

    const filter = {};
    if (Object.keys(dateRange).length > 0) {
      filter.createdAt = dateRange;
    }

    if (userId) {
        filter.userId = userId;
    }

    if (discountId) {
      filter.discountId = discountId;
    }

    const totalOrders = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      currentPage: Number(page),
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders,
      orders
    });

  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.getAllOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$finalTotalAmount" }
        }
      }
    ]);

    res.status(200).json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOrderStatsByDate = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    // Default: from one year ago to today
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // include full end date

    const start = startDate
      ? new Date(startDate)
      : new Date(new Date(end).setFullYear(end.getFullYear() - 1)); // 1 year ago

    const ordersInRange = await Order.find({
      createdAt: { $gte: start, $lte: end }
    });

    const totalOrders = ordersInRange.length;

    const totalRevenue = ordersInRange.reduce((acc, order) => {
      return acc + (order.finalTotalAmount || 0);
    }, 0);

    res.status(200).json({
      totalOrders,
      totalRevenue,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTopSellingProducts = async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date();

    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.name' },
          sales: { $sum: '$items.quantity' }
        }
      },
      { $sort: { sales: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: 1,
          sales: 1
        }
      }
    ]);

    res.json({ data: topProducts });
  } catch (error) {
    console.error('Error in getTopSellingProducts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


exports.getWeeklyOrderStats = async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date();

    const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const weeks = [];

    // Prepare weekly ranges
    let currentStart = new Date(startDate);
    let weekNumber = 1;

    while (currentStart <= endDate) {
      const currentEnd = new Date(Math.min(currentStart.getTime() + oneWeek - 1, endDate.getTime()));
      weeks.push({
        label: `week${weekNumber}-from ${currentStart.toISOString().split('T')[0]} to ${currentEnd.toISOString().split('T')[0]}`,
        start: new Date(currentStart),
        end: new Date(currentEnd)
      });
      currentStart = new Date(currentEnd.getTime() + 1);
      weekNumber++;
    }

    // Fetch only necessary fields
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).select('createdAt finalTotalAmount');

    // Aggregate weekly stats
    const weeklyStats = weeks.map(week => {
      const weekOrders = orders.filter(order =>
        order.createdAt >= week.start && order.createdAt <= week.end
      );

      const orderCount = weekOrders.length;
      const revenue = weekOrders.reduce((sum, order) => sum + (order.finalTotalAmount || 0), 0);

      return {
        week: week.label,
        orderCount,
        revenue
      };
    });

    res.json({ data: weeklyStats });
  } catch (error) {
    console.error('Error in getWeeklyOrderStats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};