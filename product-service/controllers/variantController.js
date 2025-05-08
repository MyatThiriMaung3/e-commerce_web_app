const Product = require('../models/productModel');
const { recalculateProductMeta } = require('../utils/recalculateProductMeta');

// Add variant
exports.addVariant = async (req, res) => {
  const { productId } = req.params;
  const { variantName, extraDescription, price, stock, images } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.variants.push({ variantName, extraDescription, price, stock, images });


    recalculateProductMeta(product);

    await product.save();
    
    product.lastUpdatedAt = Date.now();

    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete variant
exports.deleteVariant = async (req, res) => {
  const { productId, variantId } = req.params;

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.variants = product.variants.filter(v => v._id.toString() !== variantId);

    recalculateProductMeta(product);

    await product.save();

    product.lastUpdatedAt = Date.now();

    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Update variant
exports.updateVariant = async (req, res) => {
  const { productId, variantId } = req.params;
  const { variantName, extraDescription, price, stock, images } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const variant = product.variants.find(v => v._id.toString() === variantId);
    if (!variant) return res.status(404).json({ message: 'Variant not found' });

    if (variantName !== undefined) variant.variantName = variantName;
    if (extraDescription !== undefined) variant.extraDescription = extraDescription;
    if (price !== undefined) variant.price = price;
    if (stock !== undefined) variant.stock = stock;
    if (images !== undefined) variant.images = images;

    recalculateProductMeta(product);

    await product.save();

    product.lastUpdatedAt = Date.now();

    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};