const multer = require('multer');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

/**
 * Multer configuration for handling image uploads
 */
const storage = multer.memoryStorage(); // Store files in memory for processing

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new ApiError(httpStatus.BAD_REQUEST, 'Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for initial upload (will be compressed to 2MB)
  },
});

/**
 * Handle multer errors
 */
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(httpStatus.BAD_REQUEST, 'File size too large. Maximum size is 10MB (will be compressed)'));
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ApiError(httpStatus.BAD_REQUEST, 'Unexpected file field'));
    }
    return next(new ApiError(httpStatus.BAD_REQUEST, `Upload error: ${error.message}`));
  }
  next(error);
};

/**
 * Middleware for single image upload
 */
const uploadSingle = (fieldName = 'image') => {
  return [upload.single(fieldName), handleMulterError];
};

/**
 * Middleware for multiple image uploads
 */
const uploadMultiple = (fieldName = 'images', maxCount = 5) => {
  return [upload.array(fieldName, maxCount), handleMulterError];
};

/**
 * Process base64 image data
 * @param {string} base64Data - Base64 image data
 * @returns {Object} - Processed file object
 */
const processBase64Image = (base64Data) => {
  try {
    // Extract MIME type and data
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image format');
    }

    const mimeType = matches[1];
    const data = matches[2];
    
    // Validate MIME type
    if (!mimeType.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Convert to buffer
    const buffer = Buffer.from(data, 'base64');
    
    // Log original size
    const originalSizeMB = (buffer.length / 1024 / 1024).toFixed(2);
    console.log(`Original base64 image size: ${originalSizeMB}MB`);
    
    // Validate file size (10MB limit for initial upload, will be compressed to 2MB)
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('File size too large. Maximum size is 10MB (will be compressed to 2MB)');
    }

    return {
      buffer,
      mimetype: mimeType,
      originalname: `upload-${Date.now()}.jpg`, // Always save as JPG
      size: buffer.length,
    };
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid image data: ${error.message}`);
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  processBase64Image,
};
