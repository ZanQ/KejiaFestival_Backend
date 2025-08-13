const QRCode = require('qrcode');
const GoogleCloudStorageService = require('./googleCloudStorage.service');
const config = require('../config/config');
const logger = require('../config/logger');

class QRCodeService {
  constructor() {
    this.gcsService = new GoogleCloudStorageService();
  }

  /**
   * Generate QR code for menu item
   * @param {Object} menuItemData - Menu item data
   * @param {string} userId - Vendor user ID
   * @param {string} itemId - Menu item ID (optional, will use menuItemData._id if not provided)
   * @returns {Promise<string>} - QR code image URL
   */
  async generateMenuItemQRCode(menuItemData, userId, itemId = null) {
    try {
      // Import userService here to avoid circular dependency
      const { userService } = require('./index');
      
      // Get user info to create directory name
      const user = await userService.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Use provided itemId or extract from menuItemData
      const menuItemId = itemId || menuItemData._id || menuItemData.id;
      if (!menuItemId) {
        throw new Error('Menu item ID is required for QR code generation');
      }

      // Create user directory name (sanitized username or userId)
      const userDirectory = this.sanitizeDirectoryName(user.username || user.name || userId);
      
      // Create QR code data - URL to frontend dashboard with item ID
      const qrData = this.createQRData(menuItemData, user, menuItemId);
      
      // Generate QR code as buffer
      const qrCodeBuffer = await QRCode.toBuffer(qrData, {
        type: 'png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      // Generate unique filename for QR code
      const fileName = this.generateQRFileName(menuItemData.name);
      
      // Upload QR code to Google Cloud Storage
      const qrCodeUrl = await this.gcsService.uploadImage(
        qrCodeBuffer, 
        fileName, 
        userDirectory,
        {
          contentType: 'image/png',
          originalName: fileName,
          type: 'qr-code',
          // Don't resize QR codes - keep original dimensions
          width: null,
          height: null,
          quality: 100
        }
      );

      logger.info(`QR code generated for menu item: ${qrCodeUrl}`);
      return qrCodeUrl;

    } catch (error) {
      logger.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Create QR code data content
   * @param {Object} menuItemData - Menu item data
   * @param {Object} user - User/vendor data
   * @param {string} itemId - Menu item ID
   * @returns {string} - QR code data string (frontend URL)
   */
  createQRData(menuItemData, user, itemId) {
    // Create URL pointing to frontend dashboard with item ID
    const frontendUrl = config.frontend.url || 'http://localhost:3000';
    const dashboardUrl = `${frontendUrl}/dashboard?itemId=${itemId}`;
    
    logger.info(`Creating QR code with URL: ${dashboardUrl}`);
    return dashboardUrl;
  }

  /**
   * Generate QR code filename
   * @param {string} itemName - Menu item name
   * @returns {string} - QR code filename
   */
  generateQRFileName(itemName) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const sanitizedName = itemName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);
    
    return `qr-${sanitizedName}-${timestamp}-${random}.png`;
  }

  /**
   * Delete QR code from Google Cloud Storage
   * @param {string} qrCodeUrl - QR code URL to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteQRCode(qrCodeUrl) {
    try {
      // Extract file path from URL
      const bucketName = this.gcsService.bucketName;
      const baseUrl = `https://storage.googleapis.com/${bucketName}/`;
      
      if (!qrCodeUrl.startsWith(baseUrl)) {
        throw new Error('Invalid QR code URL format');
      }

      const filePath = qrCodeUrl.replace(baseUrl, '');
      return await this.gcsService.deleteImage(filePath);

    } catch (error) {
      logger.error('Error deleting QR code:', error);
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
}

module.exports = QRCodeService;
