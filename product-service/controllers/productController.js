const Product = require('../models/productModel');

exports.createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllProducts = async (req, res) => {
  const products = await Product.find();
  res.status(200).json(products);
};

// GET /api/products with pagination and sorting
// exports.getProductsSort = async (req, res) => {
//   try {
//     const {
//       sort_by = 'updated',
//       order = 'desc',
//       page = 1,
//       limit = 20
//     } = req.query;

//     const sortOrder = order === 'desc' ? -1 : 1;

//     // Map of allowed sort fields
//     const sortFields = {
//       name: 'name',
//       price: 'price',
//       rating: 'rating.average',
//       updated: 'lastUpdatedAt'
//     };

//     const sortField = sortFields[sort_by] || 'updated';

//     const skip = (page - 1) * limit;
//     const totalProducts = await Product.countDocuments();

//     const products = await Product.find()
//       .sort({ [sortField]: sortOrder })
//       .skip(skip)
//       .limit(Number(limit));

//     res.status(200).json({
//       currentPage: Number(page),
//       totalPages: Math.ceil(totalProducts / limit),
//       totalProducts,
//       products
//     });
//   } catch (err) {
//     console.error('Error fetching products:', err);
//     res.status(500).json({ error: 'Server Error' });
//   }
// };

exports.getProductsSort = async (req, res) => {
  try {
    let {
      sort_by = 'updated',
      order = 'desc',
      page = 1,
      limit = 20,
      category = [],        // list of category names
      minPrice = 0,
      maxPrice = Infinity,
      minRating = 0,
      maxRating = 5,
      search = ''              // partial or full name search
    } = req.query;

    // Normalize category to always be an array
    if (typeof category === 'string') {
      category = [category];  // convert single string to array
    }

    const sortOrder = order === 'desc' ? -1 : 1;

    const sortFields = {
      name: 'name',
      price: 'price',
      rating: 'rating.average',
      updated: 'lastUpdatedAt',
      sales: 'sales'
    };

    const sortField = sortFields[sort_by] || 'lastUpdatedAt';

    const skip = (page - 1) * limit;

    // Build Filter Query
    const filter = {
      price: { $gte: minPrice, $lte: maxPrice },
      'rating.average': { $gte: minRating, $lte: maxRating },
      name: { $regex: search, $options: 'i' } // case-insensitive partial match
    };

    // Filter by categories
    if (category.length > 0) {
      filter.tag = { $in: category };
    }

    const totalProducts = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      currentPage: Number(page),
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
      products
    });

  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Server Error' });
  }
};

exports.getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.status(200).json(product);
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get products by tags and limit number of products
exports.getProductsByTags = async (req, res) => {
  try {
    const { tags, limit } = req.query;

    // Ensure that tags are provided
    if (!tags) {
      return res.status(400).json({ error: 'Tags parameter is required' });
    }

    // Split the tags by commas
    const tagsArray = tags.split(',');

    // If limit is 'all', we won't limit the number of results
    const queryLimit = limit === 'all' ? 0 : parseInt(limit, 10);

    // Find products that match any of the provided tags
    const products = await Product.find({ tags: { $in: tagsArray } })
      .limit(queryLimit)
      .exec();

    if (products.length === 0) {
      return res.status(404).json({ error: 'No products found for the given tags' });
    }

    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.incrementProductSales = async (req, res) => {
  try {
    const { productId, incrementBy = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $inc: { sales: incrementBy } },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Sales count updated successfully.',
      product: updatedProduct
    });
  } catch (err) {
    console.error('Error incrementing product sales:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.decreaseProductStock = async (req, res) => {
  try {
    const { productId, variantId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');

    // Find the variant by name
    const variant = product.variants.find(v => v._id.toString() === variantId);
    if (!variant) throw new Error('Variant not found');

    // Check if enough stock is available
    if (variant.stock < quantity) throw new Error('Not enough variant stock');
    if (product.totalStock < quantity) throw new Error('Not enough total stock');

    // Decrease stock
    variant.stock -= quantity;
    product.totalStock -= quantity;

    // Update lastUpdatedAt
    product.lastUpdatedAt = new Date();

    // Save changes
    await product.save();

    res.status(200).json(product);
  } catch (err) {
    console.error('Error incrementing product sales:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
