const Rating = require('../models/ratingModel');
const Product = require('../models/productModel');

exports.createRating = async (req, res) => {
  try {
    const { productId, userId, username, rating, comment } = req.body;

    // checking if the user has already rated the product
    const existingRating = await Rating.findOne({ productId, userId });
    if (existingRating) {
      return res.status(400).json({ error: 'You have already rated this product.' });
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
        count,
        fiveStar: ratings.filter(r => r.rating === 5).length,
        fourStar: ratings.filter(r => r.rating === 4).length,
        threeStar: ratings.filter(r => r.rating === 3).length,
        twoStar: ratings.filter(r => r.rating === 2).length,
        oneStar: ratings.filter(r => r.rating === 1).length
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
  res.status(200).json(ratings);
};

exports.getRatingsByProductId = async (req, res) => {
  const ratings = await Rating.find({ productId: req.params.productId });
  res.status(200).json(ratings);
};