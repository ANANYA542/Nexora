const AppError = require('../utils/AppError');

const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return next(new AppError(JSON.stringify(errors), 400));
  }

  req[source] = result.data;
  next();
};

module.exports = { validate };
