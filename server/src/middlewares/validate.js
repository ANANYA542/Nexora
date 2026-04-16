const AppError = require('../utils/AppError');

/**
 * validate — higher-order function that returns an Express middleware.
 *
 * Usage:  router.post('/route', validate(mySchema), controller)
 *
 * It parses req.body (or req.query for GET requests) through the given Zod
 * schema and replaces the raw input with the parsed/coerced output so that
 * controllers always receive clean, typed data.
 *
 * On failure it throws an AppError(400) with every field error listed.
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'} source  - where to read input from (default: 'body')
 */
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return next(new AppError(JSON.stringify(errors), 400));
  }

  // Replace raw input with Zod-coerced output (defaults applied, types cast)
  req[source] = result.data;
  next();
};

module.exports = { validate };
