const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    seq: {
      type: Number,
      default: 0
    }
  },
  {
    collection: 'counters',
    timestamps: true
  }
);

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

module.exports = Counter;
