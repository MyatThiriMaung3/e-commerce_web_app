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
