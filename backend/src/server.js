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

// Academic
const classRoutes = require('./modules/academic/classes/class.routes');
const classLevelRoutes = require('./modules/academic/class-levels/class-level.routes');
const academicYearRoutes = require('./modules/academic/academic-years/academic-year.routes');

// Employee — master data
const employeeCategoryRoutes = require('./modules/employee/employee-master/employee-categories/employee-category.routes');
const employeeGroupRoutes = require('./modules/employee/employee-master/employee-groups/employee-group.routes');
const designationRoutes = require('./modules/employee/employee-master/designations/designation.routes');
// Employee — employee info & sub-tabs
const employeeRoutes = require('./modules/employee/employee-info/employees/employee.routes');
const employeePayrollRoutes = require('./modules/employee/employee-info/employee-payroll/employee-payroll.routes');
const { router: employeeBankAccountRoutes, ifscRouter } = require('./modules/employee/employee-info/employee-bank-accounts/employee-bank-accounts.routes');
const employeeQualificationRoutes = require('./modules/employee/employee-info/employee-qualifications/employee-qualifications.routes');
const employeeExperienceRoutes = require('./modules/employee/employee-info/employee-experience/employee-experience.routes');
const employeeDocumentRoutes = require('./modules/employee/employee-info/employee-documents/employee-document.routes');
const employeeRelationRoutes = require('./modules/employee/employee-info/employee-family/relation.routes');

// Student
const studentProfileRoutes = require('./modules/student/student-profiles/student-profile.routes');
const studentProfileFamilyRoutes = require('./modules/student/student-profiles/student-profile-family.routes');

// Master
const sequenceCodeRoutes = require('./modules/master/sequence-master/sequence-codes/sequence-code.routes');
const sequenceControlRoutes = require('./modules/master/sequence-master/sequence-controls/sequence-control.routes');
const documentTypeRoutes = require('./modules/master/document-types/document-type.routes');
const feeCategoryRoutes = require('./modules/master/fee-categories/fee-category.routes');

const { lookupPincode } = require('./shared/helpers/pincode.helper');
const { authenticate } = require('./shared/middleware/auth.middleware');
const resHelper = require('./shared/helpers/response.helper');

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
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/edit-locks', editLockRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/class-levels', classLevelRoutes);
app.use('/api/v1/academic-years', academicYearRoutes);
app.use('/api/v1/employee-categories', employeeCategoryRoutes);
app.use('/api/v1/employee-groups', employeeGroupRoutes);
app.use('/api/v1/designations', designationRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/employees/:employeeId/payroll', employeePayrollRoutes);
app.use('/api/v1/employees/:employeeId/bank-accounts', employeeBankAccountRoutes);
app.use('/api/v1/employees/:employeeId/qualifications', employeeQualificationRoutes);
app.use('/api/v1/employees/:employeeId/experience', employeeExperienceRoutes);
app.use('/api/v1/employees/:employeeId/documents', employeeDocumentRoutes);
app.use('/api/v1/employees/:employeeId/family', employeeRelationRoutes);
app.use('/api/v1/ifsc', ifscRouter);
app.use('/api/v1/student-profiles', studentProfileRoutes);
app.use('/api/v1/student-profiles/:profileId/family', studentProfileFamilyRoutes);
app.use('/api/v1/sequence-codes', sequenceCodeRoutes);
app.use('/api/v1/sequence-controls', sequenceControlRoutes);
app.use('/api/v1/document-types', documentTypeRoutes);
app.use('/api/v1/fee-categories', feeCategoryRoutes);

// Shared
app.get('/api/v1/pincode/:pincode', authenticate, lookupPincode);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Global error handler — catches anything forwarded by asyncHandler. Keep this
// last, after all routes, so Express treats it as the error-handling
// middleware (signature with 4 args is load-bearing).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  return resHelper.error(res);
});

app.listen(PORT, () => {
  console.log(`ShaanthiEd backend running on http://localhost:${PORT}`);
});
