// routes/todoRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const todoController = require("../controllers/todoController");
const { body } = require("express-validator");

router.get("/", authMiddleware.authenticateToken, todoController.getTodos);
router.post("/", authMiddleware.authenticateToken, todoController.createTodo);
router.put("/:id", authMiddleware.authenticateToken, todoController.updateTodo);
router.patch(
  "/:id",
  authMiddleware.authenticateToken,
  todoController.updateTodoIsDone
);
router.delete(
  "/:id",
  authMiddleware.authenticateToken,
  todoController.deleteTodo
);

module.exports = router;
