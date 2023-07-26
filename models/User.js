const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    jenisKelamin: {
      type: String,
      enum: ["Laki-laki", "Perempuan"],
    },
    email: {
      required: true,
      type: String,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    confirmPassword: {
      type: String,
    },
    isDone: {
      type: Boolean,
      default: false,
    },
    todos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Todo",
      },
    ],
    blacklistedTokens: [
      {
        type: String,
      },
    ],
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
