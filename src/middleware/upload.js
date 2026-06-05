const multer = require("multer");

// Memory storage for Vercel
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes =
    /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;

  const extname = allowedTypes.test(
    require("path")
      .extname(file.originalname)
      .toLowerCase()
  );

  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype || extname) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        "Only images, PDFs, and Office documents are allowed"
      )
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
});

module.exports = upload;