// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const config = require("../config");
const TokenBlacklist = require("../models/TokenBlacklist");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ status: "false", message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is blacklisted
    const isBlacklisted = await TokenBlacklist.findOne({ token });
    if (isBlacklisted) {
      return res
        .status(401)
        .json({ status: "false", message: "Token is blacklisted" });
    }

    // Set user to request object
    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    console.error(error);
    return res
      .status(403)
      .json({ status: "false", message: "Invalid token or token expired" });
  }
};

// generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign({ userId: user._id }, config.JWT_SECRET, {
    expiresIn: "2d",
  });
};

const generateAccessToken = (user) => {
  return jwt.sign({ userId: user._id }, config.JWT_SECRET, {
    expiresIn: "1min",
  });
};

module.exports = {
  authenticateToken,
  generateAccessToken,
  generateRefreshToken,
};
