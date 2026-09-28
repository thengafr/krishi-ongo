const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    skills: user.skills,
    experience: user.experience,
    location: user.location,
    availability: user.availability,
  };
}

router.post("/register", async (req, res) => {
  try {
    const { name, phone, email, password, role, skills, experience, location, availability } = req.body;

    if (!name || !phone || !email || !password || !role) {
      return res.status(400).json({ message: "Name, phone, email, password and role are required" });
    }

    if (!["farmer", "worker"].includes(role)) {
      return res.status(400).json({ message: "Public registration is available only for farmer or worker accounts" });
    }

    const exists = await User.findOne({ $or: [{ phone }, { email: email.toLowerCase() }] });
    if (exists) return res.status(409).json({ message: "Phone or email already registered" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      phone,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      skills: role === "worker" ? (skills || []) : [],
      experience: role === "worker" ? Number(experience || 0) : 0,
      location: location || {},
      availability: role === "worker" ? (availability || []) : [],
    });

    res.status(201).json({ message: "Registration successful", user: publicUser(user) });
  } catch (error) {
    console.error("REGISTER ERROR", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { phone, password, role } = req.body;
    if (!phone || !password || !role) return res.status(400).json({ message: "Phone, password and role are required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(401).json({ message: "User not found" });
    if (user.role !== role) return res.status(401).json({ message: `This account is registered as ${user.role}` });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Incorrect password" });

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ message: "Login successful", token, user: publicUser(user) });
  } catch (error) {
    console.error("LOGIN ERROR", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
