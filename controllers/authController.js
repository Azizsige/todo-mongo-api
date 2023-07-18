// controllers/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult, body } = require("express-validator");
const config = require("../config");
const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../middleware/authMiddleware");

const register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    const existingUser = await User.findOne({ username });
    const existingEmail = await User.findOne({ email });

    // Validasi request menggunakan Express Validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // dapatkan data msg dari array errors
      const extractedErrors = [];
      errors.array().map((err) => extractedErrors.push({ msg: err.msg }));

      return res.status(400).json({ errors: extractedErrors });
    }

    if (existingUser || existingEmail) {
      return res
        .status(400)
        .json({ message: "Username atau Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ userId: user._id }, config.JWT_SECRET, {
      expiresIn: "5min",
    });

    res.status(201).json({
      status: "true",
      message: "Registration successful",
      user,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "false",
      message: "Internal Server Error or Token has been expired",
    });
  }
};

const login = async (req, res) => {
  try {
    // Validasi request menggunakan Express Validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // dapatkan data msg dari array errors
      const extractedErrors = [];
      errors.array().map((err) => extractedErrors.push({ msg: err.msg }));

      return res.status(400).json({ errors: extractedErrors });
    }

    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });
    if (!user) {
      return res.status(401).json({
        status: "false",
        message: "Username atau Email belum terdaftar",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        status: "false",
        message: "Password yang anda masukkan salah",
      });
    }

    // Generate access token
    const accessToken = generateAccessToken(user._id);

    // Generate refresh token
    const refreshToken = generateRefreshToken(user._id);

    // Simpan refresh token ke dalam user
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token as HTTP-only cookie
    // res.cookie("refreshToken", accessToken, {
    //   httpOnly: true,
    //   secure: true, // Set this to true if using HTTPS
    // });

    // res.set("Set-Cookie", refreshToken);

    res.status(200).json({
      status: "true",
      message: "Berhasil Login",
      user,
      accessToken,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "false",
      message: "Internal Server Error or Token has been expired",
    });
  }
};

// haput token user yang sedang login dari database
const logout = async (req, res) => {
  try {
    const accessToken = req.body.accessToken;
    const userId = req.body.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!accessToken) {
      return res.status(400).json({ message: "Access Token is required" });
    }

    const user = await User.findById(userId);

    // Add access token to blacklist
    const accessTokenBlacklist = new TokenBlacklist({ token: accessToken });
    await accessTokenBlacklist.save();

    // Add refresh token to blacklist
    const refreshTokenBlacklist = new TokenBlacklist({
      token: user.refreshToken,
    });
    await refreshTokenBlacklist.save();

    // Remove refresh token from user
    user.refreshToken = null;
    await user.save();

    res
      .status(200)
      .json({ status: "true", message: "Successfully logged out" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "true", message: "Internal Server Error" });
  }
};

// refresh token
const refreshToken = async (req, res) => {
  try {
    const userId = req.body.userId; // Ganti dengan field yang sesuai di permintaan Anda
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const refreshToken = user.refreshToken;

    if (!refreshToken) {
      return res.status(403).json({ message: "No refresh token provided" });
    }

    const refreshTokenBlacklisted = await TokenBlacklist.findOne({
      token: refreshToken,
    });
    if (refreshTokenBlacklisted) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
    const refreshedUser = await User.findById(decoded.userId);
    if (!refreshedUser) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(refreshedUser._id);

    res.status(200).json({ status: "true", accessToken: newAccessToken });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ status: "false", message: "Session sudah berakhir" });
  }
};
// dapat semua data user yang ada di database
const getAllUser = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ status: "true", users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "false", message: "Internal Server Error" });
  }
};

module.exports = {
  register,
  login,
  getAllUser,
  logout,
  refreshToken,
};
