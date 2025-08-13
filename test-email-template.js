const emailTemplateService = require('./src/services/emailTemplate.service');
const fs = require('fs').promises;
const path = require('path');

async function testEmailTemplate() {
  try {
    console.log('Testing email template generation...');
    
    const testEmail = 'test@example.com';
    const testUrl = 'http://localhost:3000/complete-registration?token=abc123&coOwnersFlag=true';
    
    const htmlContent = await emailTemplateService.generateVerificationEmail(testEmail, testUrl);
    
    // Save the generated HTML to a file for preview
    const outputPath = path.join(__dirname, 'src/templates/test-output.html');
    await fs.writeFile(outputPath, htmlContent);
    
    console.log('✅ Email template generated successfully!');
    console.log('📁 Preview saved to:', outputPath);
    console.log('📧 Email length:', htmlContent.length, 'characters');
    
  } catch (error) {
    console.error('❌ Error testing email template:', error);
  }
}

testEmailTemplate();
