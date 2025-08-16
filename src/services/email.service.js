const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../config/logger');
const emailTemplateService = require('./emailTemplate.service');

const transport = nodemailer.createTransport(config.email.smtp);
/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} html
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text, html = null) => {
  const msg = { 
    from: config.email.from, 
    to, 
    subject, 
    text,
    ...(html && { html })
  };
  await transport.sendMail(msg);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset password';
  // replace this url with the link to the reset password page of your front-end app
  const resetPasswordUrl = `http://link-to-app/reset-password?token=${token}`;
  const text = `Dear user,
To reset your password, click on this link: ${resetPasswordUrl}
If you did not request any password resets, then ignore this email.`;
  await sendEmail(to, subject, text);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token) => {
  const subject = 'Email Verification';
  // replace this url with the link to the email verification page of your front-end app
  const verificationEmailUrl = `http://link-to-app/verify-email?token=${token}`;
  const text = `Dear user,
To verify your email, click on this link: ${verificationEmailUrl}
If you did not create an account, then ignore this email.`;
  await sendEmail(to, subject, text);
};

/**
 * Send pre-registration verification email
 * @param {string} to
 * @param {string} token
 * @param {string} coOwnersFlag
 * @returns {Promise}
 */
const sendPreRegistrationEmail = async (to, token, name,coOwnersFlag) => {
  const subject = 'Verify your email to complete registration';
  
  // Build verification URL with parameters
  const verificationUrl = config.frontend.url + `/complete-registration?token=${token}&coOwnersFlag=${coOwnersFlag}`;
  
  try {
    // Generate HTML email using MJML template
    const htmlContent = await emailTemplateService.generateVerificationEmail(to, name, verificationUrl);
    
    // Fallback text content
    const textContent = `Dear user,
To complete your registration, please verify your email by clicking on this link: ${verificationUrl}
This link will expire in 24 hours.
If you did not request this registration, please ignore this email.`;
    
    await sendEmail(to, subject, textContent, htmlContent);
  } catch (error) {
    logger.error('Error generating email template, falling back to text email:', error);
    
    // Fallback to text-only email if template fails
    const textContent = `Dear user,
To complete your registration, please verify your email by clicking on this link: ${verificationUrl}
This link will expire in 24 hours.
If you did not request this registration, please ignore this email.`;
    
    await sendEmail(to, subject, textContent);
  }
};

const sendIncomingOrderEmail = async (to, vendorName, customerName, orderName, orderAmount, orderDate, orderUrl) => {
  const subject = 'New Incoming Order';

  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' }).format(orderAmount);

  const htmlContent = await emailTemplateService.compileEmailTemplate('incoming-order-email', {
    vendorName,
    customerName,
    orderName,
    orderAmount: formattedAmount,
    orderDate,
    orderUrl,
    vendorEmail: to
  });

  //Sending Email to Vendor
  console.log('Sending order email...');
  console.log(`To: ${to}, Vendor Name: ${vendorName}, Customer Name: ${customerName}, Order Name: ${orderName}, Order Amount: ${formattedAmount}, Order Date: ${orderDate}, Order URL: ${orderUrl}`); 

  const textContent = `Hello ${vendorName},\nYou have received a new order from ${customerName}.\nOrder Name: ${orderName}\nAmount: ${formattedAmount}\nDate: ${orderDate}\nView: ${orderUrl}`;
  await sendEmail(to, subject, textContent, htmlContent);

};

const sendOrderReadyEmail = async (to, customerName, orderName, orderAmount, readyDate, orderUrl) => {
  const subject = 'Your Order is Ready!';

  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' }).format(orderAmount);

  console.log('Sending order ready email...');
  console.log(`To: ${to}, Customer Name: ${customerName}, Order Name: ${orderName}, Amount: ${orderAmount}, Ready Date: ${readyDate}, Order URL: ${orderUrl}`);

  const htmlContent = await emailTemplateService.compileEmailTemplate('order-ready-email', {
    customerName,
    orderName,
    orderAmount: formattedAmount,
    readyDate,
    orderUrl,
    customerEmail: to
  });
  const textContent = `Hello ${customerName},\nYour order ${orderName} is ready!\nAmount: ${orderAmount}\nReady at: ${readyDate}\nView: ${orderUrl}`;
  await sendEmail(to, subject, textContent, htmlContent);
};

const sendDepositConfirmedEmail = async (to, customerName, depositAmount, transactionId, depositDate, accountUrl) => {
  const subject = 'Deposit Confirmed';
  const htmlContent = await emailTemplateService.compileEmailTemplate('deposit-confirmed-email', {
    customerName,
    depositAmount,
    transactionId,
    depositDate,
    accountUrl,
    customerEmail: to
  });
  const textContent = `Hello ${customerName},\nYour deposit of ${depositAmount} has been confirmed.\nTransaction ID: ${transactionId}\nDate: ${depositDate}\nView account: ${accountUrl}`;
  await sendEmail(to, subject, textContent, htmlContent);
};

module.exports = {
  transport,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendPreRegistrationEmail,
  sendIncomingOrderEmail,
  sendOrderReadyEmail,
  sendDepositConfirmedEmail
};
