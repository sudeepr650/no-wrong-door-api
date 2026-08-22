const express = require("express");
const router = express.Router();

const {
  getUnifiedData
} = require("../services/unifiedService");

// GET /api/unified
router.get("/", async (req, res) => {
  try {
    const data = await getUnifiedData();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Failed to retrieve unified data",
      message: error.message
    });
  }
});

module.exports = router;