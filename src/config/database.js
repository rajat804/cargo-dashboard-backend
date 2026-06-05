const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      console.log("MongoDB already connected");
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB Error:", error.message);
    throw error;
  }
};

module.exports = connectDB;