const mongoose = require('mongoose');
const { VendorCode } = require('../models');
const config = require('../config/config');

// Generate a random alphanumeric code
const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate 100 unique vendor codes
const generateVendorCodes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    // Clear existing vendor codes (optional)
    await VendorCode.deleteMany({});
    console.log('Cleared existing vendor codes');

    const codes = new Set();
    
    // Generate 100 unique codes
    while (codes.size < 100) {
      codes.add(generateCode());
    }

    // Convert to array and create vendor code documents
    const vendorCodes = Array.from(codes).map(code => ({
      code,
      description: `Vendor registration code - ${code}`,
    }));

    // Insert all codes into database
    await VendorCode.insertMany(vendorCodes);
    console.log(`Successfully created ${vendorCodes.length} vendor codes`);

    // Display the first 10 codes as examples
    console.log('\nExample vendor codes:');
    vendorCodes.slice(0, 10).forEach(code => {
      console.log(`- ${code.code}`);
    });

    console.log('\nAll vendor codes have been generated successfully!');
    
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error generating vendor codes:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  generateVendorCodes();
}

module.exports = generateVendorCodes;
