const { Storage } = require('@google-cloud/storage');
const config = require('../config/config');
const logger = require('../config/logger');
const sharp = require('sharp');
const path = require('path');

class GoogleCloudStorageService {
  constructor() {
    // Initialize Google Cloud Storage
    this.storage = new Storage({
      projectId: config.googleCloud.projectId,
      keyFilename: config.googleCloud.keyFile, // Path to service account key file
    });
    
    this.bucketName = config.googleCloud.bucketName;
    this.bucket = this.storage.bucket(this.bucketName);
  }

  /**
   * Upload image to Google Cloud Storage
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} fileName - File name
   * @param {string} userDirectory - User directory (username or userId)
   * @param {Object} options - Upload options
   * @returns {Promise<string>} - Public URL of uploaded image
   */
  async uploadImage(imageBuffer, fileName, userDirectory, options = {}) {
    try {
      // Process image with Sharp (resize, optimize, etc.) - skip for QR codes
      let processedImage;
      if (options.width === null && options.height === null) {
        // Don't process QR codes
        processedImage = imageBuffer;
      } else {
        processedImage = await this.processImage(imageBuffer, options);
      }
      
      // Create file path: users/{userDirectory}/menu-items/{fileName} or users/{userDirectory}/qr-codes/{fileName}
      const fileType = options.type === 'qr-code' ? 'qr-codes' : 'menu-items';
      const filePath = `users/${userDirectory}/${fileType}/${fileName}`;
      
      // Create file reference
      const file = this.bucket.file(filePath);
      
      // Upload options
      const uploadOptions = {
        metadata: {
          contentType: options.contentType || 'image/jpeg',
          cacheControl: 'public, max-age=31536000', // Cache for 1 year
          metadata: {
            uploadedAt: new Date().toISOString(),
            userDirectory,
            originalName: options.originalName || fileName,
            type: options.type || 'menu-item',
          }
        },
        resumable: false,
      };

      // Upload the file
      await file.save(processedImage, uploadOptions);

      // Make the file publicly accessible
      await file.makePublic();

      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
      
      logger.info(`Image uploaded successfully: ${publicUrl}`);
      return publicUrl;

    } catch (error) {
      logger.error('Error uploading image to Google Cloud Storage:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Process image using Sharp
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {Object} options - Processing options
   * @returns {Promise<Buffer>} - Processed image buffer
   */
  async processImage(imageBuffer, options = {}) {
    try {
      let sharp_instance = sharp(imageBuffer);
      const TARGET_SIZE = 2 * 1024 * 1024; // 2MB target size

      // Get image metadata
      const metadata = await sharp_instance.metadata();
      
      // Resize image if dimensions are specified or if it's too large
      if (options.width || options.height) {
        sharp_instance = sharp_instance.resize({
          width: options.width || 800,
          height: options.height || 600,
          fit: options.fit || 'inside',
          withoutEnlargement: true
        });
      } else {
        // Smart resize based on original dimensions and file size
        let targetWidth = 800;
        let targetHeight = 600;
        
        // If original image is very large, be more aggressive with resizing
        if (metadata.width > 2000 || metadata.height > 2000) {
          targetWidth = 600;
          targetHeight = 450;
        }
        
        sharp_instance = sharp_instance.resize({
          width: targetWidth,
          height: targetHeight,
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Start with high quality and reduce if needed
      let quality = options.quality || 85;
      let processedBuffer;

      // Iterative compression to stay under 2MB
      do {
        processedBuffer = await sharp_instance
          .jpeg({
            quality: quality,
            progressive: true,
            mozjpeg: true // Use mozjpeg encoder for better compression
          })
          .toBuffer();

        // If still too large, reduce quality
        if (processedBuffer.length > TARGET_SIZE && quality > 30) {
          quality -= 10;
          logger.info(`Image still ${(processedBuffer.length / 1024 / 1024).toFixed(2)}MB, reducing quality to ${quality}%`);
        } else {
          break;
        }
      } while (processedBuffer.length > TARGET_SIZE && quality >= 30);

      // If still too large after quality reduction, try more aggressive resize
      if (processedBuffer.length > TARGET_SIZE) {
        logger.warn('Image still too large after quality reduction, applying more aggressive resize');
        
        sharp_instance = sharp(imageBuffer).resize({
          width: 400,
          height: 300,
          fit: 'inside',
          withoutEnlargement: true
        });

        processedBuffer = await sharp_instance
          .jpeg({
            quality: 70,
            progressive: true,
            mozjpeg: true
          })
          .toBuffer();
      }

      const finalSizeMB = (processedBuffer.length / 1024 / 1024).toFixed(2);
      
      // Validate final size
      if (processedBuffer.length > TARGET_SIZE) {
        logger.warn(`Warning: Image is ${finalSizeMB}MB, which exceeds 2MB target`);
      } else {
        logger.info(`Image processed successfully: ${finalSizeMB}MB (quality: ${quality}%)`);
      }

      return processedBuffer;

    } catch (error) {
      logger.error('Error processing image:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Delete image from Google Cloud Storage
   * @param {string} filePath - File path in bucket
   * @returns {Promise<boolean>} - Success status
   */
  async deleteImage(filePath) {
    try {
      await this.bucket.file(filePath).delete();
      logger.info(`Image deleted successfully: ${filePath}`);
      return true;
    } catch (error) {
      logger.error('Error deleting image:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Generate unique file name
   * @param {string} originalName - Original file name
   * @param {string} prefix - File prefix
   * @returns {string} - Unique file name
   */
  generateFileName(originalName, prefix = 'menu-item') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(originalName) || '.jpg';
    return `${prefix}-${timestamp}-${random}${extension}`;
  }

  /**
   * Check if bucket exists and is accessible
   * @returns {Promise<boolean>} - Accessibility status
   */
  async checkBucketAccess() {
    try {
      await this.bucket.getMetadata();
      logger.info('Google Cloud Storage bucket is accessible');
      return true;
    } catch (error) {
      logger.error('Cannot access Google Cloud Storage bucket:', error);
      return false;
    }
  }
}

module.exports = GoogleCloudStorageService;
