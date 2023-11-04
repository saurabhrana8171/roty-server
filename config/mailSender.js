const nodemailer = require('nodemailer');



module.exports = {

    async mailSender(email, link) {
        try {
            // Create a transporter object
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'rotyseven@gmail.com',
                    pass: `qegbbsacelcieybd`
                }
            });

            // Email content
            const mailOptions = {
                from: 'rotyseven@gmail.com',
                to: email,
                subject: 'Roty Invoice',
                text: `Thanks for subscribing the Roty. 

                Click the following link to download your invoice ${link}`
            };

            // Send email using async/await
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent:', info.response);
            return  // Return the payment link
        } catch (error) {
            return
            console.error('Error:', error);
            throw error;
        }
    }
};
