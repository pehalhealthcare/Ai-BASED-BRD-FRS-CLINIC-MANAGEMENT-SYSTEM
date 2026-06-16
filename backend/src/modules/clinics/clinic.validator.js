const { z } = require('zod');
const mongoose = require('mongoose');

const createClinicSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(150),
    code: z.string().trim().toUpperCase().min(2).max(20),
    image: z.string().optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    parentClinicId: z.any().refine((val) => {
      if (!val) return true; // allow null, undefined, empty string
      return mongoose.Types.ObjectId.isValid(val);
    }, {
      message: 'Invalid parentClinicId'
    }).optional(),
    address: z.object({
      line1: z.string().trim().default(''),
      line2: z.string().trim().default(''),
      city: z.string().trim().default(''),
      state: z.string().trim().default(''),
      pincode: z.string().trim().default(''),
      country: z.string().trim().default('India')
    }).optional()
  })
});

module.exports = {
  createClinicSchema
};
