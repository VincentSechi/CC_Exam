// notifi/server.js
const express = require('express');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(
  express.json({
    limit: '10kb',
  })
);

const sanitizeInput = (value, maxLength = 500) =>
  typeof value === 'string'
    ? value.replace(/[<>]/g, '').replace(/[\r\n]+/g, ' ').trim().slice(0, maxLength)
    : '';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!process.env.EMAIL_USER || !process.env.EMAIL_APPLICATION_PASSWORD) {
  console.error('Les identifiants email ne sont pas configurés.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APPLICATION_PASSWORD,
  },
});

app.post('/notify', async (req, res) => {
  const to = sanitizeInput(req.body.to, 254);
  const subject = sanitizeInput(req.body.subject, 160);
  const text = sanitizeInput(req.body.text, 5000);

  if (!emailRegex.test(to)) {
    return res.status(400).json({ message: 'Adresse email invalide.' });
  }

  if (!subject) {
    return res.status(400).json({ message: 'Le sujet est requis.' });
  }

  if (!text) {
    return res.status(400).json({ message: 'Le contenu du message est requis.' });
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
    return res.status(200).json({ message: 'Email envoyé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email', error);
    return res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email.' });
  }
});

const PORT = process.env.NOTIFI_PORT || 4002;
app.listen(PORT, () => {
  console.log(`Service de notification en écoute sur le port ${PORT}`);
});
