const express = require("express");
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

router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    if (req.auth.userId !== req.params.userId && req.auth.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/:userId", authMiddleware, async (req, res) => {
  try {
    if (req.auth.userId !== req.params.userId && req.auth.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const allowed = ["name", "phone", "email", "skills", "experience", "availability"];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    if (update.email) update.email = update.email.toLowerCase();
    if (update.experience !== undefined) update.experience = Number(update.experience || 0);

    const user = await User.findByIdAndUpdate(req.params.userId, update, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated", user: publicUser(user) });
  } catch (error) {
    console.error("PROFILE UPDATE ERROR", error);
    res.status(500).json({ message: "Profile update failed" });
  }
});

module.exports = router;
