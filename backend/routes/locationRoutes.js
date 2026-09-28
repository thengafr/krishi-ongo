const express = require("express");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.patch("/:userId", authMiddleware, async (req, res) => {
  try {
    if (req.auth.userId !== req.params.userId && req.auth.role !== "admin") {
      return res.status(403).json({ message: "You can update only your own location" });
    }

    const { latitude, longitude } = req.body;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: "Valid latitude and longitude are required" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { location: { latitude, longitude, updatedAt: new Date() } },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Location updated successfully", location: user.location });
  } catch (error) {
    console.error("LOCATION ERROR", error);
    res.status(500).json({ message: "Failed to update location" });
  }
});

module.exports = router;
