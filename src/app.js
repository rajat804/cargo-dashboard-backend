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
const localManifestRoutes = require('./routes/localManifestRoutes');
const longRouteManifestRoutes = require('./routes/longRouteManifestRoutes');
const lorryHireChallanRoutes = require('./routes/lorryHireChallanRoutes');
const authRoutes = require('./routes/authRoutes');


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



// Routes
app.use("/api/bookings", bookingRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/static", staticRoutes);
app.use("/api/bookings-manual", bookingManualRoutes);
app.use('/api/local-manifests', localManifestRoutes);
app.use('/api/long-route-manifests', longRouteManifestRoutes);
app.use('/api/lorry-hire-challans', lorryHireChallanRoutes);
app.use('/api/auth', authRoutes);




// Health check
app.get("/api/health", (req, res) => {  
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CargoMax Backend Running"
  });
});

// app.listen(5000, () => {
//   console.log("Server is running on port 5000");
// });
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