require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const orgRoutes = require('./modules/organizations/org.routes');
const locationRoutes = require('./modules/locations/location.routes');
const moduleRoutes = require('./modules/modules/module.routes');
const menuRoutes = require('./modules/menus/menu.routes');
const menuModuleRoutes = require('./modules/menu-modules/menu-module.routes');
const groupRoutes = require('./modules/groups/group.routes');
const groupModuleRoutes = require('./modules/group-modules/group-module.routes');
const permissionRoutes = require('./modules/permissions/permission.routes');

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
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/menus', menuRoutes);
app.use('/api/v1/menu-modules', menuModuleRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/group-modules', groupModuleRoutes);
app.use('/api/v1/permissions', permissionRoutes);

// Shared
app.get('/api/v1/pincode/:pincode', authenticate, lookupPincode);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`ShaanthiEd backend running on http://localhost:${PORT}`);
});
