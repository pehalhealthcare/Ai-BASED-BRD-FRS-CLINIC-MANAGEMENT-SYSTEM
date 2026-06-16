const jwt = require('jsonwebtoken');

const { env } = require('../../config/env');

const generateAccessToken = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      email: user.email
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn
    }
  );

const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret);

module.exports = {
  generateAccessToken,
  verifyAccessToken
};
