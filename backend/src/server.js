require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const orgRoutes = require('./modules/organizations/org.routes');
const locationRoutes = require('./modules/locations/location.routes');

const { lookupPincode } = require('./shared/helpers/pincode.helper');
const { authenticate } = require('./shared/middleware/auth.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/organizations', orgRoutes);
app.use('/api/v1/locations', locationRoutes);

// Shared
app.get('/api/v1/pincode/:pincode', authenticate, lookupPincode);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`ShaanthiEd backend running on http://localhost:${PORT}`);
});
