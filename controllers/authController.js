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
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const PasswordResetToken = require("../models/passwordResetTokenSchema ");

const register = async (req, res) => {
  try {
    const {
      fullName,
      username,
      email,
      jenisKelamin,
      password,
      confirmPassword,
    } = req.body;

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
      fullName,
      username,
      email,
      jenisKelamin,
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

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // dapatkan data msg dari array errors
      const extractedErrors = [];
      errors.array().map((err) => extractedErrors.push({ msg: err.msg }));

      return res.status(400).json({ errors: extractedErrors });
    }

    // Cari user berdasarkan email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Buat token reset password
    const token = crypto.randomBytes(20).toString("hex");
    const passwordResetToken = new PasswordResetToken({
      user: user._id,
      token,
    });
    await passwordResetToken.save();

    // Kirim email dengan tautan reset password
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.EMAIL_ADDRESS,
        pass: config.EMAIL_PASSWORD,
      },
    });

    const resetLink = `https://todo-mongo.vercel.app/verification-reset-password/${token}`; // Ganti your-app-url dengan URL aplikasi Anda
    const mailOptions = {
      from: config.EMAIL_ADDRESS,
      to: user.email,
      subject: "Reset Password",
      subject: "Reset Password",
      html: `
      <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
          <h2 style="color: #333;">Halo ${user.username},</h2>
          <p style="color: #666;">Kami menerima permintaan untuk mereset password akun Anda.</p>
          <p style="color: #666;">Klik tautan di bawah ini untuk mereset password:</p>
          <a href="${resetLink}" style="color: #007bff; text-decoration: none;">Reset Password</a>
          <p style="color: #666;">Jika Anda tidak melakukan permintaan ini, abaikan email ini.</p>
          <p style="color: #666;">Terima kasih,</p>
          <p style="color: #666;">Tim Support</p>
          
          <!-- Footer -->
          <div style="margin-top: 20px;">
            <img src="https://your-website.com/footer-image.png" alt="Footer Image" style="display: block; max-width: 100%; height: auto;">
            <p style="color: #666; text-align: center;">&copy; 2023 Your Company. All rights reserved.</p>
          </div>
          <!-- End of Footer -->
        </div>
    `,
      //   html: `
      //   <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
      //       <img src="" style="width: 100%; max-height: 150px; margin-bottom: 20px;">
      //       <h2 style="color: #333;">Halo ${user.username},</h2>
      //       <p style="color: #666;">Kami menerima permintaan untuk mereset password akun Anda.</p>
      //       <p style="color: #666;">Klik tautan di bawah ini untuk mereset password:</p>
      //       <a href="${resetLink}" style="color: #007bff; text-decoration: none;">Reset Password</a>
      //       <p style="color: #666;">Jika Anda tidak melakukan permintaan ini, abaikan email ini.</p>
      //       <p style="color: #666;">Terima kasih,</p>
      //       <p style="color: #666;">Tim Support</p>
      //       <img src="" style="width: 100%; max-height: 100px; margin-top: 20px;">
      //     </div>
      // `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to send email" });
      }

      res.status(200).json({
        status: "true",
        message: "Link sudah dikirim ",
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "false", message: "Internal Server Error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // dapatkan data msg dari array errors
      const extractedErrors = [];
      errors.array().map((err) => extractedErrors.push({ msg: err.msg }));

      return res.status(400).json({ errors: extractedErrors });
    }

    // Cari token reset password
    const passwordResetToken = await PasswordResetToken.findOne({ token });
    if (!passwordResetToken) {
      return res.status(404).json({ message: "Token not found" });
    }

    if (!password) {
      return res.status(404).json({ message: "Password harus diisi" });
    }

    if (password == passwordResetToken.password) {
      return res
        .status(404)
        .json({ message: "Password tidak boleh sama dengan password lama" });
    }

    // Cari user berdasarkan token reset password
    const user = await User.findById(passwordResetToken.user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Atur password baru untuk user
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    passwordResetToken.deleteOne();

    res
      .status(200)
      .json({ status: "true", message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// cek token forgotPassword di database
const verifyResetToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    const passwordResetToken = await PasswordResetToken.findOne({ token });

    const createdAt = passwordResetToken.createdAt;
    const dateCreateAt = new Date(createdAt);
    // ubah dateCreateAt ke menit yg normal
    const dateCreateAtExpired = dateCreateAt.getMinutes();

    const timestamp = Date.now();
    const dateNow = new Date(timestamp);
    const dateNowWillExpired = dateCreateAtExpired + 2;

    // console.log(dateNow.getMinutes());
    console.log(dateCreateAtExpired);
    console.log(dateNowWillExpired);

    if (!passwordResetToken) {
      return res.status(404).json({ message: "Token not found" });
    }

    if (dateNow.getMinutes() >= dateNowWillExpired) {
      return res
        .status(401)
        .json({ status: "false", message: "Token expired" });
      // console.log("token expired");
    }

    if (passwordResetToken.isUsed === true) {
      return res.status(401).json({ message: "Token has been used" });
    }

    passwordResetToken.isUsed = true;
    res.status(200).json({ status: "true", message: "Token valid", createdAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// dapat semua data user yang ada di database

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyResetToken,
};
