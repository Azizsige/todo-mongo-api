// controllers/todoController.js
const Todo = require("../models/Todo");
const User = require("../models/User");

const createTodo = async (req, res) => {
  try {
    const { title, description, isDone } = req.body;
    const userId = req.user.userId;

    const todo = await Todo.create({
      title,
      description,
      isDone,
      user: userId,
    });

    res
      .status(201)
      .json({ status: "true", message: "Todo berhasil ditambahkan", todo });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ status: "false", message: "Todo gagal ditambahkan" });
  }
};

const getTodos = async (req, res) => {
  try {
    const userId = req.user.userId;
    const todos = await Todo.find({ user: userId });

    res.status(200).json({ todos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getCurrentUserTodos = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const todos = await Todo.find({ user: userId }).populate(
      "user",
      "username"
    );

    res.status(200).json({ user, todos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// update todo
const updateTodo = async (req, res) => {
  try {
    const todoId = req.params.id;
    const { title, description, isDone } = req.body;

    const updatedTodo = await Todo.findByIdAndUpdate(
      todoId,
      { title, description, isDone },
      { new: true }
    );

    res.status(200).json({
      status: "true",
      message: "Todo berhasil di Update",
      todo: updatedTodo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "false", message: "Todo gagal diupdate" });
  }
};

// update todo isDone only
const updateTodoIsDone = async (req, res) => {
  try {
    const todoId = req.params.id;
    const { isDone } = req.body;

    const updatedTodo = await Todo.findByIdAndUpdate(
      todoId,
      { isDone },
      { new: true }
    );

    if (!updatedTodo) {
      return res
        .status(404)
        .json({ status: "false", message: "Todo not found" });
    }

    res.status(200).json({
      status: "true",
      message: "Todo berhasil di Update",
      todo: updatedTodo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "false", message: "Todo gagal diupdate" });
  }
};

// delete todo
const deleteTodo = async (req, res) => {
  try {
    const todoId = req.params.id;

    const deletedTodo = await Todo.findByIdAndDelete(todoId);

    if (!deletedTodo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    res.status(200).json({ status: "true", message: "Todo berhasil dihapus!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "false", message: "Todo gagal dihapus!" });
  }
};

module.exports = {
  createTodo,
  getTodos,
  getCurrentUserTodos,
  updateTodo,
  deleteTodo,
  updateTodoIsDone,
};
