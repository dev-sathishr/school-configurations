require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Auth & Shared
const authRoutes = require('./modules/auth/auth.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const fileRoutes = require('./modules/files/file.routes');
const editLockRoutes = require('./modules/edit-locks/edit-lock.routes');

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
const sessionRoutes = require('./modules/settings/sessions/session.routes');

const engineMetaRoutes        = require('./modules/engine/meta/meta.routes');
const engineRecordsRoutes     = require('./modules/engine/records/records.routes');
const engineRelationsRoutes   = require('./modules/engine/relations/relations.routes');
const engineChildRoutes       = require('./modules/engine/child-records/child-records.routes');
const enginePrintRoutes       = require('./modules/engine/print-formats/print-formats.routes');
const engineWorkflowRoutes    = require('./modules/engine/workflow/workflow.routes');

const { lookupPincode } = require('./shared/helpers/pincode.helper');
const { authenticate } = require('./shared/middleware/auth.middleware');
const resHelper = require('./shared/helpers/response.helper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Auth
app.use('/api/v1/auth', authRoutes);

// Settings
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
app.use('/api/v1/sessions', sessionRoutes);

// Engine
app.use('/api/v1/engine/meta', engineMetaRoutes);

// Fixed engine-records utility routes (must be before /:slug to avoid slug capture)
const engineRecordsCtrl = require('./modules/engine/records/records.controller');
app.get('/api/v1/engine/records/sequence-code-options', authenticate, engineRecordsCtrl.sequenceCodeOptions);

app.use('/api/v1/engine/records/:slug', engineRecordsRoutes);
app.use('/api/v1/engine/relations', engineRelationsRoutes);
app.use('/api/v1/engine/child-records', engineChildRoutes);
app.use('/api/v1/engine/print-formats/:slug', enginePrintRoutes);
app.use('/api/v1/engine/workflow/:slug',       engineWorkflowRoutes);

// Shared
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/edit-locks', editLockRoutes);

app.get('/api/v1/pincode/:pincode', authenticate, lookupPincode);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  return resHelper.error(res);
});

app.listen(PORT, () => {
  console.log(`School Configurations backend running on http://localhost:${PORT}`);
});
