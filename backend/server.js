/**
 * TrustGuard Backend — Entry Point
 * Loads environment, creates Express app, starts listening.
 */
'use strict';

require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[TrustGuard] Backend running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});
