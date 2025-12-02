// controllers/productController.js
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { productStockSchema } = require('../utils/validationSchemas');
const logger = require('../utils/logger');

exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find().lean();
        res.json(products);
    } catch (error) {
        logger.error('Erreur lors de la récupération des produits: %s', error.stack || error.message);
        res.status(500).json({ message: 'Impossible de récupérer les produits pour le moment.' });
    }
};

exports.updateProductStock = async (req, res) => {
    try {
      const { productId } = req.params;
      const { error, value } = productStockSchema.validate(req.body, {
        abortEarly: false,
      });
  
      if (error) {
        return res.status(400).json({
          message: 'Valeur de stock invalide.',
          details: error.details.map((detail) => detail.message),
        });
      }
  
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: 'Identifiant produit invalide.' });
      }
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Produit non trouvé." });
      }
  
      product.stock = value.stock;
      product.updatedAt = Date.now();
  
      await product.save();
  
      res.json({ message: "Stock mis à jour avec succès.", product });
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du stock: %s', error.stack || error.message);
      res.status(500).json({ message: "Erreur serveur." });
    }
  };
