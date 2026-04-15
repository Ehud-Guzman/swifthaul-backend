const { validationResult } = require('express-validator');

/**
 * Wraps an array of express-validator rules and appends a handler that
 * returns 422 with the first error message if validation fails.
 *
 * Usage in a route file:
 *   const { validate } = require('../middleware/validate');
 *   const { body } = require('express-validator');
 *   router.post('/', validate([body('email').isEmail()]), handler);
 */
const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ message: errors.array()[0].msg });
    }
    next();
  },
];

module.exports = { validate };
