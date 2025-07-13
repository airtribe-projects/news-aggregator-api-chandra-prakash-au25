const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  articleId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  url: { type: String },
  urlToImage: { type: String },
  publishedAt: { type: Date },
  read: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Article', articleSchema);