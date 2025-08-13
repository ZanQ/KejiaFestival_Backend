const QRCodeService = require('./qrCode.service');
const ImageUploadService = require('./imageUpload.service');

module.exports.authService = require('./auth.service');
module.exports.emailService = require('./email.service');
module.exports.tokenService = require('./token.service');
module.exports.userService = require('./user.service');
module.exports.socketService = require('./socket.service');
module.exports.menuItemService = require('./menuItem.service');
module.exports.orderService = require('./order.service');
module.exports.vendorCodeService = require('./vendorCode.service');
module.exports.adminService = require('./admin.service');
module.exports.imageUploadService = new ImageUploadService();
module.exports.googleCloudStorageService = require('./googleCloudStorage.service');
module.exports.qrCodeService = new QRCodeService();
