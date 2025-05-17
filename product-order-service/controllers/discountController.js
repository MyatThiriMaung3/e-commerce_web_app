const Discount = require('../models/discountModel');

exports.createDiscount = async (req, res) => {
    try {
        const discount = new Discount(req.body);
        const saved = await discount.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getDiscounts = async (req, res) => {
    try {
        const discounts = await Discount.find();
        res.status(200).json(discounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getDiscountById = async (req, res) => {
    try {
        const discount = await Discount.findById(req.params.id);
        if (!discount) return res.status(404).json({ message: 'Discount not found' });
        res.status(200).json(discount);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateDiscount = async (req, res) => {
    try {
        const discount = await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!discount) return res.status(404).json({ message: 'Discount not found' });
        res.status(200).json(discount);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteDiscount = async (req, res) => {
    try {
        const discount = await Discount.findByIdAndDelete(req.params.id);
        if (!discount) return res.status(404).json({ message: 'Discount not found' });
        res.status(200).json({ message: 'Discount deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.checkDiscount = async (req, res) => {
  const code = req.params.code;

  if (!code) {
    return res.status(400).json({ success: false, message: 'Discount code is required.' });
  }

  try {
    const discountCode = String(code || '').trim().toUpperCase();
    const discount = await Discount.findOne({ code: discountCode });

    if (!discount) {
      return res.status(404).json({ success: false, message: 'Discount code not found.' });
    }

    return res.status(200).json({
      success: true,
      discountId: discount._id,
      discountCode: discount.code,
      discountAmount: discount.value,
      discountUsedCount: discount.usedCount,
      discountMaxUsage: discount.maxUsage
    });

  } catch (error) {
    console.error('Error checking discount:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

exports.incrementDiscountUsage = async (req, res) => {
  try {
    const { code, incrementBy = 1 } = req.body;

    const updatedDiscount = await Discount.findOneAndUpdate(
      { code: code.toUpperCase() },
      { $inc: { usedCount: incrementBy } },
      { new: true }
    );

    if (!updatedDiscount) {
      res.status(404).json( { error: `Discount code "${code}" not found.` } );
    }

    res.status(200).json(updatedDiscount);
  } catch (err) {
    console.error('Error incrementing discount usage:', err.message);
    res.status(500).json({ error: err.message });
  }
}
