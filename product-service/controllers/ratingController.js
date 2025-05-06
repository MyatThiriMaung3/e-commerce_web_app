const Rating = require('../models/ratingModel');
const Product = require('../models/productModel');

exports.createRating = async (req, res) => {
  try {
    const { productId, userId, username, rating, comment } = req.body;

    // checking if the user has already rated the product
    const existingRating = await Rating.findOne({ productId, userId });
    if (existingRating) {
      return res.status(400).json({ message: 'You have already rated this product.' });
    }

    // Create rating
    await Rating.create({ productId, userId, username, rating, comment });

    // Recalculate rating summary
    const ratings = await Rating.find({ productId });

    const count = ratings.length;
    const total = ratings.reduce((sum, r) => sum + r.rating, 0);
    const average = total / count;

    // Update product rating
    await Product.findByIdAndUpdate(productId, {
      rating: {
        average,
        totalAmount: total,
        count
      },
      lastUpdatedAt: new Date()
    });

    res.status(201).json({ message: 'Rating submitted and product rating updated.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getRatings = async (req, res) => {
  const ratings = await Rating.find();
  res.json(ratings);
};

exports.getRatingsByProductId = async (req, res) => {
  const ratings = await Rating.find({ productId: req.params.productId });
  res.json(ratings);
};