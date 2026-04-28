const repo = require('./employee-bank-accounts.repository');
const { validate } = require('../../../../shared/helpers/validate.helper');

const VALID_TYPES = ['savings', 'current', 'salary', 'other'];

const BANK_RULES = {
  bank_name:      { required: true, max: 100, label: 'Bank Name' },
  account_no:     { required: true, max: 50,  label: 'Account No' },
  ifsc_code:      { max: 20, label: 'IFSC Code' },
  branch_name:    { max: 100, label: 'Branch Name' },
  account_holder: { required: true, max: 200, label: 'Account Holder Name' },
};

async function getAll(employeeId) {
  const accounts = await repo.findAllByEmployee(employeeId);
  return { data: accounts };
}

async function getById(bankAccountId) {
  const db = require('../../../../config/database');
  const result = await db.query(
    `SELECT ba.*, bam.is_active FROM settings.bank_accounts ba
     JOIN settings.bank_account_mappings bam ON ba.id = bam.bank_account_id
     WHERE ba.id = $1 AND ba.deleted_at IS NULL AND bam.deleted_at IS NULL
     LIMIT 1`,
    [bankAccountId]
  );
  if (!result.rows[0]) return { error: 'notFound', message: 'Bank account not found' };
  return { data: result.rows[0] };
}

async function save(employeeId, body, userId) {
  const errors = validate(body, BANK_RULES);
  if (body.account_type && !VALID_TYPES.includes(body.account_type)) {
    errors.push('Invalid account type');
  }
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  await repo.save(employeeId, body, userId);
  const accounts = await repo.findAllByEmployee(employeeId);
  return { data: accounts };
}

async function remove(bankAccountId, userId) {
  await repo.remove(bankAccountId, userId);
  return {};
}

async function setActive(bankAccountId, employeeId, userId) {
  await repo.setActive(bankAccountId, employeeId, userId);
  const accounts = await repo.findAllByEmployee(employeeId);
  return { data: accounts };
}

module.exports = { getAll, getById, save, remove, setActive };
