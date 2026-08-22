const express = require("express");
const config = require("./config/config");
const unifiedRoutes = require("./routes/unifiedRoutes");

const app = express();

app.use(express.json());

// Health endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "no-wrong-door-api"
  });
});

// Unified data endpoint
app.use("/api/unified", unifiedRoutes);

const PORT = config.port || 3000;

app.listen(PORT, () => {
  console.log(`No Wrong Door API running on http://localhost:${PORT}`);
});