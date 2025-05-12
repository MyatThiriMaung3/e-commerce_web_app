const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  status: { type: String, enum: ["normal", "banned"], default: "normal" },
  role: { type: String, enum: ["customer", "admin"], default: "customer" },
  defaultAddress: { type: String, default: null},
  addresses: [
    {
      title: { type: String, default: "Work" },
      address: String,
      country: { type: String, default: "Vietnam" },
      city: { type: String, default: "Ho Chi Minh City" },
      state: { type: String, default: "HCMC" },
      zip: { type: String, default: "00700" }
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