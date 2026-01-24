const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Send email notification
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email body (text)
 */
const sendEmail = async (to, subject, text) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email sending skipped: Missing credentials');
        throw new Error('Missing email credentials in .env');
    }

    const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text
    });

    console.log(`Email sent: ${info.messageId}`);
    return true;
};

module.exports = { sendEmail };
