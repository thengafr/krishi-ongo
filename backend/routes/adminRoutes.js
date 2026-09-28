const express = require("express");
const User = require("../models/User");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authMiddleware, requireRole("admin"));

router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to load users" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const [totalUsers, farmers, workers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "farmer" }),
      User.countDocuments({ role: "worker" }),
    ]);
    res.json({ totalUsers, farmers, workers });
  } catch (error) {
    res.status(500).json({ message: "Failed to load stats" });
  }
});

module.exports = router;
