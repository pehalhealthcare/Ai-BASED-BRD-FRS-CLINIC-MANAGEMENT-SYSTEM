const mongoose = require('mongoose');

const catalogCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      enum: ['LAB', 'MEDICINE']
    },
    description: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'catalog_categories'
  }
);

catalogCategorySchema.index({ name: 1, type: 1 }, { unique: true });

const CatalogCategory = mongoose.models.CatalogCategory || mongoose.model('CatalogCategory', catalogCategorySchema);

module.exports = CatalogCategory;
