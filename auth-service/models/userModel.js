const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  status: { type: String, enum: ["normal", "banned"], default: "normal" },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  addresses: [
    {
      title: { type: String, default: "Work" },
      address: String,
      country: { type: String, default: "Vietnam" },
      city: String,
      state: String,
      zip: String
    }
  ],
  cart: [
    {
      productId: mongoose.Schema.Types.ObjectId,
      variantId: String,
      name: String,
      variantName: String,
      image: String,
      quantity: Number,
      price: Number
    }
  ],
  ownedLoyaltyPoints: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);