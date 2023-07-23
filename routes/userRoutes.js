// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const userController = require("../controllers/userController");

router.get(
  "/me",
  authMiddleware.authenticateToken,
  userController.getCurrentUserWithTodos
);

router.put(
  "/update/:id",
  authMiddleware.authenticateToken,
  userController.updateUser
);

router.delete(
  "/delete/:id",
  authMiddleware.authenticateToken,
  userController.deleteUser
);

module.exports = router;
