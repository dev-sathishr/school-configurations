require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Auth & Shared
const authRoutes = require('./modules/auth/auth.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const fileRoutes = require('./modules/files/file.routes');

// Settings
const userRoutes = require('./modules/settings/users/user.routes');
const orgRoutes = require('./modules/settings/organizations/org.routes');
const locationRoutes = require('./modules/settings/locations/location.routes');
const moduleRoutes = require('./modules/settings/modules/module.routes');
const menuRoutes = require('./modules/settings/menus/menu.routes');
const menuModuleRoutes = require('./modules/settings/menu-modules/menu-module.routes');
const groupRoutes = require('./modules/settings/groups/group.routes');
const groupModuleRoutes = require('./modules/settings/group-modules/group-module.routes');
const permissionRoutes = require('./modules/settings/permissions/permission.routes');
const permissionRequestRoutes = require('./modules/settings/permission-requests/permission-request.routes');
const preferencesRoutes = require('./modules/settings/user-preferences/preferences.routes');

// Academic
const classRoutes = require('./modules/academic/classes/class.routes');
const classLevelRoutes = require('./modules/academic/class-levels/class-level.routes');

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
app.use('/api/v1/permission-requests', permissionRequestRoutes);
app.use('/api/v1/me/preferences', preferencesRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/class-levels', classLevelRoutes);

// Shared
app.get('/api/v1/pincode/:pincode', authenticate, lookupPincode);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`ShaanthiEd backend running on http://localhost:${PORT}`);
});
