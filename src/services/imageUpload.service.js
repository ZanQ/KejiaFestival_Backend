const GoogleCloudStorageService = require('./googleCloudStorage.service');
const { processBase64Image } = require('../middlewares/upload');
const userService = require('./user.service');
const logger = require('../config/logger');

class ImageUploadService {
  constructor() {
    this.gcsService = new GoogleCloudStorageService();
  }

  /**
   * Upload menu item image
   * @param {Object} imageData - Image data (file or base64)
   * @param {string} userId - User ID (vendor)
   * @param {Object} options - Upload options
   * @returns {Promise<string>} - Image URL
   */
  async uploadMenuItemImage(imageData, userId, options = {}) {
    try {
      // Get user info to create directory name
      const user = await userService.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create user directory name (sanitized username or userId)
      const userDirectory = this.sanitizeDirectoryName(user.username || user.name || userId);
      
      let fileBuffer, fileName, contentType;

      // Handle different types of image data
      if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        // Base64 image
        const processedFile = processBase64Image(imageData);
        fileBuffer = processedFile.buffer;
        fileName = this.gcsService.generateFileName(processedFile.originalname, 'menu-item');
        contentType = processedFile.mimetype;
      } else if (imageData.buffer) {
        // Multer file object
        fileBuffer = imageData.buffer;
        fileName = this.gcsService.generateFileName(imageData.originalname, 'menu-item');
        contentType = imageData.mimetype;
      } else {
        throw new Error('Invalid image data format');
      }

      // Upload to Google Cloud Storage with compression options
      const imageUrl = await this.gcsService.uploadImage(fileBuffer, fileName, userDirectory, {
        contentType: 'image/jpeg', // Always save as JPEG for better compression
        originalName: fileName,
        width: options.width || 800,
        height: options.height || 600,
        quality: options.quality || 85,
      });

      logger.info(`Menu item image uploaded for user ${userId}: ${imageUrl}`);
      return imageUrl;

    } catch (error) {
      logger.error('Error uploading menu item image:', error);
      throw error;
    }
  }

  /**
   * Upload multiple menu item images
   * @param {Array} imagesData - Array of image data
   * @param {string} userId - User ID (vendor)
   * @param {Object} options - Upload options
   * @returns {Promise<Array>} - Array of image URLs
   */
  async uploadMultipleMenuItemImages(imagesData, userId, options = {}) {
    try {
      const uploadPromises = imagesData.map(imageData => 
        this.uploadMenuItemImage(imageData, userId, options)
      );

      const imageUrls = await Promise.all(uploadPromises);
      return imageUrls;

    } catch (error) {
      logger.error('Error uploading multiple menu item images:', error);
      throw error;
    }
  }

  /**
   * Delete menu item image
   * @param {string} imageUrl - Image URL to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteMenuItemImage(imageUrl) {
    try {
      // Extract file path from URL
      const bucketName = this.gcsService.bucketName;
      const baseUrl = `https://storage.googleapis.com/${bucketName}/`;
      
      if (!imageUrl.startsWith(baseUrl)) {
        throw new Error('Invalid image URL format');
      }

      const filePath = imageUrl.replace(baseUrl, '');
      return await this.gcsService.deleteImage(filePath);

    } catch (error) {
      logger.error('Error deleting menu item image:', error);
      throw error;
    }
  }

  /**
   * Sanitize directory name for file system
   * @param {string} name - Original name
   * @returns {string} - Sanitized name
   */
  sanitizeDirectoryName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length
  }

  /**
   * Check if Google Cloud Storage is properly configured
   * @returns {Promise<boolean>} - Configuration status
   */
  async checkConfiguration() {
    try {
      return await this.gcsService.checkBucketAccess();
    } catch (error) {
      logger.error('Google Cloud Storage configuration check failed:', error);
      return false;
    }
  }
}

module.exports = ImageUploadService;
