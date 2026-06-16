const mongoose = require('mongoose');
const { z } = require('zod');

const objectIdSchema = z.string().refine((value) => mongoose.Types.ObjectId.isValid(value), {
  message: 'Invalid ObjectId'
});

const objectIdParamSchema = (fieldName = 'id') =>
  z.object({
    params: z.object({
      [fieldName]: objectIdSchema
    })
  });

module.exports = {
  objectIdSchema,
  objectIdParamSchema
};
