// backend/utils/validationSchemas.js
const Joi = require('joi');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const loginSchema = Joi.object({
  username: Joi.string().trim().min(3).max(64).required(),
  password: Joi.string().min(8).max(128).required(),
});

const registerSchema = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(32).required(),
  email: Joi.string().trim().lowercase().email().max(254).required(),
  password: Joi.string()
    .min(12)
    .max(128)
    .pattern(/[A-Z]/, 'uppercase letter')
    .pattern(/[a-z]/, 'lowercase letter')
    .pattern(/\d/, 'number')
    .pattern(/[!@#$%^&*(),.?":{}|<>]/, 'special character')
    .required(),
});

const shippingAddressSchema = Joi.object({
  street: Joi.string().trim().min(3).max(120).required(),
  city: Joi.string().trim().min(2).max(60).required(),
  postalCode: Joi.string().trim().min(3).max(20).required(),
  country: Joi.string().trim().min(2).max(56).required(),
});

const orderItemSchema = Joi.object({
  productId: Joi.string().regex(objectIdRegex).required(),
  quantity: Joi.number().integer().min(1).max(9999).required(),
});

const orderCreationSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required(),
  shippingAddress: shippingAddressSchema.required(),
  paymentMethod: Joi.string()
    .valid('Carte bancaire', 'PayPal', 'Virement')
    .required(),
  shippingMethod: Joi.string().valid('colissimo', 'chronopost').required(),
});

const productStockSchema = Joi.object({
  stock: Joi.number().integer().min(0).required(),
});

const orderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('En attente', 'En cours de traitement', 'Expédiée', 'Délivrée', 'Annulée')
    .required(),
});

const objectIdParamSchema = Joi.object({
  id: Joi.string().regex(objectIdRegex).required(),
});

module.exports = {
  loginSchema,
  registerSchema,
  orderCreationSchema,
  orderStatusSchema,
  productStockSchema,
  objectIdRegex,
  objectIdParamSchema,
};
