const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const path = require("path");

// Routes
const bookingRoutes = require("./routes/bookingRoutes");
const clientRoutes = require("./routes/clientRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const fileRoutes = require("./routes/fileRoutes");
const staticRoutes = require("./routes/staticRoutes");
const bookingManualRoutes = require("./routes/bookingManualRoutes");

// Middleware
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/bookings", bookingRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/static", staticRoutes);
app.use("/api/bookings-manual", bookingManualRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;