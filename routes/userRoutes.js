// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const userController = require("../controllers/userController");

const { body } = require("express-validator");

router.get(
  "/me",
  authMiddleware.authenticateToken,
  userController.getCurrentUserWithTodos
);

router.put(
  "/update/:id",
  [
    // Validasi field harus diisi
    body("username").custom((value, { req }) => {
      //  check if input using space or not
      if (!value) {
        throw new Error("Username harus diisi");
      } else if (value.match(/\s/g)) {
        throw new Error("Username tidak boleh menggunakan spasi");
      }
      return true;
    }),
    body("email").custom((value, { req }) => {
      //  check email harus pakai @
      if (!value) {
        throw new Error("Email harus diisi huhuh");
      }

      // check email harus @gmail atau @yahoo
      if (!value.match(/^[^\s@]+@(gmail|yahoo)\.com$/)) {
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
  authMiddleware.authenticateToken,
  userController.updateUser
);

router.delete(
  "/delete/:id",
  authMiddleware.authenticateToken,
  userController.deleteUser
);

module.exports = router;
