const mjml = require('mjml');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

/**
 * Compile MJML template with Handlebars data
 * @param {string} templateName - Name of the template file (without extension)
 * @param {Object} data - Data to pass to Handlebars template
 * @returns {Promise<string>} - Compiled HTML email
 */
const compileEmailTemplate = async (templateName, data) => {
  try {
    // Read the MJML template file
    const templatePath = path.join(__dirname, '../templates', `${templateName}.mjml`);
    const mjmlTemplate = await fs.readFile(templatePath, 'utf8');
    
    // Compile with Handlebars
    const template = handlebars.compile(mjmlTemplate);
    const mjmlWithData = template(data);
    
    // Convert MJML to HTML
    const { html, errors } = mjml(mjmlWithData, {
      validationLevel: 'soft' // Don't fail on warnings
    });
    
    if (errors && errors.length > 0) {
      console.warn('MJML compilation warnings:', errors);
    }
    
    return html;
  } catch (error) {
    console.error('Error compiling email template:', error);
    throw new Error(`Failed to compile email template: ${templateName}`);
  }
};

/**
 * Generate verification email HTML
 * @param {string} email - Recipient email
 * @param {string} verificationUrl - Verification URL
 * @returns {Promise<string>} - HTML email content
 */
const generateVerificationEmail = async (email, name, verificationUrl) => {
  return await compileEmailTemplate('verification-email', {
    email,
    name,
    verificationUrl
  });
};

module.exports = {
  compileEmailTemplate,
  generateVerificationEmail,
};
