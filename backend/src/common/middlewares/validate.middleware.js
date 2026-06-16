const { ZodError } = require('zod');

const validate = (schema) => (req, _res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    req.body = parsed.body ?? req.body;
    req.params = parsed.params ?? req.params;
    req.query = parsed.query ?? req.query;

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('Zod Validation Error:', JSON.stringify(error.format(), null, 2));
    } else {
      console.error('Validation Error:', error);
    }
    next(error instanceof ZodError ? error : error);
  }
};

module.exports = { validate };
