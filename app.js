// app.js
const express = require("express");
const mongoose = require("mongoose");
const config = require("./config");
const authRoutes = require("./routes/authRoutes");
const todoRoutes = require("./routes/todoRoutes");
const userRoutes = require("./routes/userRoutes");

const cookieParser = require("cookie-parser");

const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: "http://localhost:1234",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(cookieParser());

app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/users", userRoutes);

mongoose
  .connect(config.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(5000, () => {
      console.log("Server started on port 3000");
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
  });
