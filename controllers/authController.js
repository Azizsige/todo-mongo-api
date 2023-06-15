// controllers/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult, body } = require("express-validator");
const config = require("../config");
const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");

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

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ status: "false", message: "Email belum terdaftart" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(401)
        .json({
          status: "false",
          message: "Password yang anda masukkan salah",
        });
    }

    // Generate access token
    const accessToken = jwt.sign({ userId: user._id }, config.JWT_SECRET, {
      expiresIn: "12h",
    });

    // Generate refresh token
    const refreshToken = jwt.sign({ userId: user._id }, config.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Simpan refresh token ke dalam user
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      status: "true",
      message: "Berhasil Login",
      user,
      accessToken,
      expiresIn: "12h",
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
    const token = req.headers["authorization"].split(" ")[1];

    // Add token to blacklist
    const blacklistedToken = new TokenBlacklist({ token });
    await blacklistedToken.save();

    // Remove refresh token from user
    const user = await User.findById(req.user.userId);
    user.refreshToken = null;
    await user.save();

    res
      .status(200)
      .json({ status: "true", message: "Successfully logged out" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "false", message: "Internal Server Error" });
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
};
