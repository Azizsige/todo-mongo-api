// controllers/userController.js
const User = require("../models/User");
const Todo = require("../models/Todo");
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const e = require("express");

const getCurrentUserWithTodos = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select("-password -refreshToken");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const todos = await Todo.find({ user: userId });

    user.todos = todos;

    // tampilkan data todos ke dalam schema user
    res.status(200).json({ status: "true", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullName, username, email, jenisKelamin } = req.body;

    const existingEmail = await User.findOne({ email });
    const existingUser = await User.findOne({ username });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const extractedErrors = [];
      errors
        .array()
        .map((err) => extractedErrors.push({ [err.param]: err.msg }));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Periksa dan ubah hanya parameter yang diterima
    if (fullName) {
      user.fullName = fullName;
    }
    if (username) {
      if (existingUser || user.username === username) {
        user.username = username;
      } else if (!existingUser || user.username !== username) {
        user.username = username;
      } else {
        return res.status(400).json({ message: "Username sudah digunakan" });
      }
    }
    if (email) {
      if (existingEmail || user.email === email) {
        user.email = email;
      } else if (!existingEmail || user.email !== email) {
        user.email = email;
      } else {
        return res.status(400).json({ message: "Email sudah digunakan" });
      }
    }
    if (jenisKelamin) {
      user.jenisKelamin = jenisKelamin;
    }

    // Simpan perubahan
    await user.save();

    res
      .status(200)
      .json({ status: "true", message: "User berhasil diupdate", user });
  } catch (error) {
    res.status(500).json({
      status: "false",
      message: "Internal Server Error or Token Expired",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ status: "true", message: "User berhasil dihapus" });
  } catch (error) {
    res.status(500).json({
      status: "false",
      message: "Internal Server Error or Token Expired",
    });
  }
};

module.exports = {
  getCurrentUserWithTodos,
  updateUser,
  deleteUser,
};
