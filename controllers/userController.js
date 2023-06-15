// controllers/userController.js
const User = require("../models/User");
const Todo = require("../models/Todo");

const getCurrentUserWithTodos = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const todos = await Todo.find({ user: userId });

    user.todos = todos;

    // tampilkan data todos ke dalam schema user
    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  getCurrentUserWithTodos,
};
