const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./src/config/database");
const app = require("./src/app");

// Connect DB
connectDB();

// Export app for Vercel
module.exports = app;