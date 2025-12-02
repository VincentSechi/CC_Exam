// backend/controllers/orderController.js
const axios = require('axios');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { orderCreationSchema, orderStatusSchema, objectIdRegex } = require('../utils/validationSchemas');
const orderLog = require('debug')('orderRoutes:console');
const logger = require('../utils/logger');


exports.createOrder = async (req, res) => {
  try {
    const { error, value } = orderCreationSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: 'Les informations de commande sont invalides.',
        details: error.details.map((detail) => detail.message),
      });
    }

    const userId = req.user?.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Utilisateur non authentifié.' });
    }

    const sanitizedAddress = Object.fromEntries(
      Object.entries(value.shippingAddress).map(([key, val]) => [key, val.trim()])
    );

    const productIds = [...new Set(value.items.map((item) => item.productId))];

    const products = await Product.find({
      _id: { $in: productIds },
    }).lean();

    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    const missingProducts = productIds.filter((id) => !productMap.has(id));

    if (missingProducts.length) {
      return res.status(400).json({
        message: 'Certains produits sont introuvables.',
        details: missingProducts,
      });
    }

    const orderDetails = value.items.map(({ productId, quantity }) => {
      const product = productMap.get(productId);

      return {
        productId: product._id,
        quantity,
        price: product.price,
      };
    });

    const total = orderDetails.reduce((acc, { price, quantity }) => acc + price * quantity, 0);

    const newOrder = new Order({
      userId,
      items: orderDetails,
      total,
      shippingAddress: sanitizedAddress,
      paymentMethod: value.paymentMethod,
      shippingMethod: value.shippingMethod,
    });

    const savedOrder = await newOrder.save();

    try {
      await axios.post('http://localhost:8000/notify', {
        to: 'syaob@yahoo.fr',
        subject: 'Nouvelle Commande Créée',
        text: `Une commande a été créée avec succès pour les produits suivants : \n${orderDetails
          .map((item) => `Produit ID : ${item.productId}, Quantité : ${item.quantity}`)
          .join('\n')}`,
      });
    } catch (notificationError) {
      orderLog(`Erreur lors de l'envoi de la notification : ${notificationError.message}`);
    }

    res.status(201).json({
      message: 'Commande créée avec succès',
      order: savedOrder,
    });
  } catch (error) {
    logger.error('Erreur lors de la création de la commande: %s', error.stack || error.message);
    res.status(500).json({
      message: 'Une erreur est survenue lors de la création de la commande.',
    });
  }
};


// exports.createOrder = async (req, res) => {
//     const products = req.body; // Attente d'un tableau d'objets { productId, quantity }
//     console.log(`products are ${JSON.stringify(products)}`)
    
//     // // Vérification du format des données
//     if (!Array.isArray(products.items) || products.items.length === 0) {
//       return res.status(400).json({ message: 'Le corps de la requête doit contenir un tableau d\'objets { productId, quantity }.' });
//     }
  
//     try {
//     //   // Logique pour traiter chaque produit de la commande
//       const orderDetails = products.items.map(({ productId, quantity }) => {
//         console.log(`Produit ID : ${productId}, Quantité : ${quantity}`);
//         return { productId, quantity };
//       });

//       //TODO : requete avec le modele order pour ajouter les commande en db
  
//     //   // Appel au micro-service de notification
//       try {
//         await axios.post('http://localhost:8000/notify', {
//           to: "syaob@yahoo.fr",
//           subject: 'Nouvelle Commande Créée',
//           text: `Une commande a été créée avec succès pour les produits suivants : \n${orderDetails
//             .map((item) => `Produit ID : ${item.productId}, Quantité : ${item.quantity}`)
//             .join('\n')}`,
//         });
//       } catch (error) {
//         console.error('Erreur lors de l\'envoi de la notification', error);
//       }
  
//       // Appel au micro-service de gestion des stocks
//       try {
//         await Promise.all(
//           products.items.map(({ productId, quantity }) =>
//             axios.post('http://localhost:8000/update-stock', { productId, quantity })
//           )
//         );
//       } catch (error) {
//         console.error('Erreur lors de la mise à jour des stocks', error);
//       }
  
//       // Réponse de succès
//       res.status(201).json({
//         message: 'Commande créée avec succès',
//         orderDetails,
//       });
//     } catch (error) {
//       console.error('Erreur lors de la création de la commande', error);
//       res.status(500).json({ message: 'Une erreur est survenue lors de la création de la commande.' });
//     }
//   };

exports.deleteOrder = async (req, res) => {
    const { orderId } = req.params;

    if (!orderId || !objectIdRegex.test(orderId)) {
      return res.status(400).json({ message: 'Identifiant de commande invalide.' });
    }

    try {
      const deletedOrder = await Order.findByIdAndDelete(orderId);

      if (!deletedOrder) {
        return res.status(404).json({ message: 'Commande non trouvée.' });
      }

      res.status(200).json({ message: 'Commande supprimée avec succès.' });
    } catch (error) {
      logger.error('Erreur lors de la suppression de la commande: %s', error.stack || error.message);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
};

exports.getOrders = async(req, res)=>{
  try {
    const orders = await Order.find().lean();
    res.status(200).json(orders);
  } catch (error) {
    logger.error('Erreur lors de la récupération des commandes: %s', error.stack || error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.validateOrder = async (req, res) => {
  const { orderId } = req.params;

  if (!orderId || !objectIdRegex.test(orderId)) {
    return res.status(400).json({ message: 'Identifiant de commande invalide.' });
  }

  try {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: 'En cours de traitement', updatedAt: new Date() },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée.' });
    }

    res.status(200).json({ message: `Commande ${orderId} validée avec succès.`, order });
  } catch (error) {
    logger.error('Erreur lors de la validation de la commande: %s', error.stack || error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;

  if (!orderId || !objectIdRegex.test(orderId)) {
    return res.status(400).json({ message: 'Identifiant de commande invalide.' });
  }

  try {
    const { error, value } = orderStatusSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        message: 'Le statut fourni est invalide.',
        details: error.details.map((detail) => detail.message),
      });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: value.status, updatedAt: new Date() },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Commande non trouvée.' });
    }

    res.status(200).json({ message: 'Statut mis à jour avec succès', order });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la commande: %s', error.stack || error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
