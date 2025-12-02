// gateway/server.js
const express = require('express');
const helmet = require('helmet');
const dotenv = require('dotenv');
const notifiProxy = require('./routes/notifi');
const stockProxy = require('./routes/stock');

dotenv.config();

const requiredEnv = ['NOTIFI_SERVICE_URL', 'STOCK_SERVICE_URL'];
requiredEnv.forEach((envKey) => {
  if (!process.env[envKey]) {
    console.error(`La variable d'environnement ${envKey} est manquante.`);
    process.exit(1);
  }
});

const app = express();

app.use(helmet());
app.use(
  express.json({
    limit: '10kb',
  })
);

app.use('/notify', notifiProxy);
app.use('/update-stock', stockProxy);

const PORT = process.env.GATEWAY_PORT || 8000;
app.listen(PORT, () => {
  console.log(`Gateway opérationnel sur le port ${PORT}`);
});
