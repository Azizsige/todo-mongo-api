// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const passport = require("passport");
const { body } = require("express-validator");

router.post(
  "/register",
  [
    // Validasi field harus diisi
    body("username").custom((value, { req }) => {
      //  check if input using space or not
      if (!value) {
        throw new Error("Username harus diisi");
      } else if (value.match(/\s/g)) {
        throw new Error("Username tidak boleh menggunakan spasi");
      } else if (value.length < 6) {
        // cek jika panjang username kurang dari 6 karakter
        throw new Error("Username minimal 6 karakter");
      }
    }),
    body("email").custom((value, { req }) => {
      if (!value) {
        throw new Error("Email harus diisi");
      } else if (!value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error("Email tidak valid");
      }
      return true;
    }),
    body("password").custom((value, { req }) => {
      // cek jika password kosong
      if (!value) {
        throw new Error("Password harus diisi");
      } else if (value.length < 6) {
        // cek jika panjang password kurang dari 6 karakter
        throw new Error("Password minimal 6 karakter");
      }
      return true;
    }),

    // Validasi konfirmasi password
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Konfirmasi password tidak sesuai");
      }
      return true;
    }),
  ],
  authController.register
);
router.post(
  "/login",
  [
    // Validasi field harus diisi
    body("email").custom((value, { req }) => {
      if (!value) {
        throw new Error("Email harus diisi");
      } else if (!value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error("Email tidak valid");
      }
      return true;
    }),
    body("password").custom((value, { req }) => {
      // cek jika password kosong
      if (!value) {
        throw new Error("Password harus diisi");
      } else if (value.length < 6) {
        // cek jika panjang password kurang dari 6 karakter
        throw new Error("Password minimal 6 karakter");
      }
      return true;
    }),
  ],
  authController.login
);
router.post("/logout", authMiddleware.authenticateToken, authController.logout);

module.exports = router;
