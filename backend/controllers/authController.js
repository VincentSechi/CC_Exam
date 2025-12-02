// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { loginSchema, registerSchema } = require('../utils/validationSchemas');
require('dotenv').config();
const authLog = require('debug')('authRoutes:console');
const logger = require('../utils/logger');

const ONE_HOUR = 60 * 60 * 1000;
const cookieBaseOptions = {
  httpOnly: true,
  sameSite: 'strict',
  path: '/',
};

exports.login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: 'Données de connexion invalides',
        details: error.details.map((detail) => detail.message),
      });
    }

    const normalizedUsername = value.username.trim();
    const user = await User.findOne({ username: normalizedUsername });

    if (!user) {
      return res.status(400).json({ message: 'Utilisateur non trouvé' });
    }

    const isMatch = await bcrypt.compare(value.password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Mot de passe incorrect' });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.cookie('token', token, {
      ...cookieBaseOptions,
      secure: process.env.NODE_ENV === 'production',
      maxAge: ONE_HOUR,
    });

    res.json({ role: user.role, username: user.username });
  } catch (error) {
    authLog(`Erreur lors de la connexion : ${error.message}`);
    logger.error('Erreur lors de la connexion: %s', error.stack || error.message);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};


exports.register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: 'Les informations fournies sont invalides.',
        details: error.details.map((detail) => detail.message),
      });
    }

    const sanitizedUsername = value.username.trim();
    const sanitizedEmail = value.email.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ email: sanitizedEmail }, { username: sanitizedUsername }],
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Cet email ou nom d’utilisateur est déjà utilisé.' });
    }

    const user = new User({
      username: sanitizedUsername,
      email: sanitizedEmail,
      password: value.password,
    });
    await user.save();

    res.status(201).json({ message: 'Utilisateur créé avec succès.' });
  } catch (error) {
    logger.error('Erreur lors de l\'inscription: %s', error.stack || error.message);
    res.status(500).json({ message: 'Une erreur est survenue.' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token', {
    ...cookieBaseOptions,
    secure: process.env.NODE_ENV === 'production',
  });
  res.status(200).json({ message: 'Déconnexion réussie.' });
};
