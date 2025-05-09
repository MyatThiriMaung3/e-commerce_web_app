const Comment = require('../models/commentModel');

exports.createComment = async (req, res) => {
  try {
    const comment = new Comment(req.body);
    await comment.save();
    res.status(201).json(comment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getComments = async (req, res) => {
  const comments = await Comment.find();
  res.status(200).json(comments);
};

exports.getCommentsByProductId = async (req, res) => {
  const comments = await Comment.find({ productId: req.params.productId });
  res.status(200).json(comments);
};