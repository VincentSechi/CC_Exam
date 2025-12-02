const express = require('express');
const app = express();
const PORT = 4003;

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

app.use(
  express.json({
    limit: '5kb',
  })
);

app.post('/update-stock', (req, res) => {
  const { productId, quantity } = req.body;

  if (typeof productId !== 'string' || !objectIdRegex.test(productId.trim())) {
    return res.status(400).json({ message: 'Identifiant produit invalide.' });
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({ message: 'La quantité doit être un entier positif.' });
  }

  const sanitizedProductId = productId.trim();
  console.log(`Mise à jour du stock: Produit ${sanitizedProductId}, Quantité ${quantity}`);
  res.json({ message: `Stock mis à jour pour le produit ${sanitizedProductId}` });
});

app.listen(PORT, () => console.log(`Service de gestion des stocks sur le port ${PORT}`));
