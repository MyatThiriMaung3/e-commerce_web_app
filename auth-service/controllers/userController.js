const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { fullName, email, addresses } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const passwordHash = await bcrypt.hash("123456", 10);

    const user = await User.create({ fullName, email, passwordHash, addresses });
    const defaultAddress = user.addresses[0]?._id;

    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { defaultAddress },
        { new: true }
      );


    res.status(201).json({ message: "User registered", updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    if (password !== null) {
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) return res.status(400).json({ error: "Invalid credentials" });
    }
    
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  const users = await User.find();
  res.json(users);
};

exports.getUserById = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
};

exports.getUserPassword = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.status(200).json(user.passwordHash);
};

// exports.updateUser = async (req, res) => {
//   const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
//   res.json(user);
// };

exports.updateUser = async (req, res) => {
    try {
      const updateData = { ...req.body };
  
      // Hash the password if it's being updated
      if (updateData.passwordHash) {
        const saltRounds = 10;
        updateData.passwordHash = await bcrypt.hash(updateData.passwordHash, saltRounds);
      }
  
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
  
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.json(updatedUser);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  };

exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: "User deleted" });
  
};



exports.getAddresses = async (req, res) => {
  const user = await User.findById(req.params.userId);
  res.json(user.addresses);
};

exports.addAddress = async (req, res) => {
  const user = await User.findById(req.params.userId);
  user.addresses.push(req.body);
  await user.save();
  res.status(201).json(user.addresses);
};

// PUT /users/:userId/addresses/:addressId
exports.updateAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.params;
    const user = await User.findById(userId);

    const address = user.addresses.id(addressId);
    if (!address) return res.status(404).json({ error: "Address not found" });

    Object.assign(address, req.body); // update fields
    await user.save();

    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /users/:userId/addresses/:addressId
exports.deleteAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.addresses = user.addresses.filter(a => a._id.toString() !== addressId);

    // recalculateProductMeta(product);

    await user.save();

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



exports.getCart = async (req, res) => {
  const user = await User.findById(req.params.userId);
  res.json(user.cart);
};

exports.addToCart = async (req, res) => {
  const user = await User.findById(req.params.userId);
  const item = req.body;

  // Optional: check if item already exists and increase quantity
  const existingItem = user.cart.find(
    i => i.productId.toString() === item.productId && i.variantId === item.variantId
  );
  if (existingItem) {
    existingItem.quantity += item.quantity;
  } else {
    user.cart.push(item);
  }

  await user.save();
  res.status(201).json(user.cart);
};

// PUT /users/:userId/cart/:itemId
exports.updateCartItem = async (req, res) => {
  try {
    const { userId, itemId } = req.params;
    const user = await User.findById(userId);

    const item = user.cart.id(itemId);
    if (!item) return res.status(404).json({ error: "Cart item not found" });

    Object.assign(item, req.body);
    await user.save();

    res.json(user.cart);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /users/:userId/cart/:itemId
exports.deleteCartItem = async (req, res) => {

  try {
    const { userId, itemId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.cart = user.cart.filter(i => i._id.toString() !== itemId);

    // recalculateProductMeta(product);

    await user.save();

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};