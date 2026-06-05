const cloudinary = require('../config/cloudinary');
const Booking = require('../models/Booking');
const fs = require('fs');
const path = require('path');

// @desc    Upload file to Cloudinary
// @route   POST /api/files/upload
// @access  Public
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const { type, bookingId } = req.body;
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: `cargomax/${type || 'uploads'}`,
      resource_type: 'auto'
    });
    
    // Delete local file after upload
    fs.unlinkSync(req.file.path);
    
    // If bookingId is provided, update the booking with file URL
    if (bookingId && type === 'pod') {
      await Booking.findByIdAndUpdate(bookingId, {
        podUploaded: true,
        podUrl: result.secure_url,
        podUploadedAt: new Date()
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes
      },
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Upload file error:', error);
    
    // Clean up local file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload multiple files
// @route   POST /api/files/upload-multiple
// @access  Public
const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }
    
    const { type, bookingId } = req.body;
    const uploadedFiles = [];
    
    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: `cargomax/${type || 'uploads'}`,
        resource_type: 'auto'
      });
      
      uploadedFiles.push({
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes
      });
      
      fs.unlinkSync(file.path);
    }
    
    res.status(200).json({
      success: true,
      data: uploadedFiles,
      message: `${uploadedFiles.length} files uploaded successfully`
    });
  } catch (error) {
    console.error('Upload multiple files error:', error);
    
    // Clean up local files
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete file from Cloudinary
// @route   DELETE /api/files/:publicId
// @access  Public
const deleteFile = async (req, res) => {
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result !== 'ok') {
      return res.status(400).json({
        success: false,
        message: 'Failed to delete file'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get file URL
// @route   GET /api/files/:publicId
// @access  Public
const getFileUrl = async (req, res) => {
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }
    
    const url = cloudinary.url(publicId, {
      secure: true
    });
    
    res.status(200).json({
      success: true,
      data: { url }
    });
  } catch (error) {
    console.error('Get file URL error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  uploadFile,
  uploadMultipleFiles,
  deleteFile,
  getFileUrl
};