const { getBankAccounts, saveBankAccount, removeBankAccount, setActiveBankAccount } = require('../../../../shared/helpers/bank-account.helper');

const ENTITY_TYPE = 'employee';

async function findAllByEmployee(employeeId) {
  return getBankAccounts(ENTITY_TYPE, employeeId);
}

async function save(employeeId, data, userId) {
  return saveBankAccount(ENTITY_TYPE, employeeId, data, userId);
}

async function remove(bankAccountId, userId) {
  return removeBankAccount(bankAccountId, userId);
}

async function setActive(bankAccountId, employeeId, userId) {
  return setActiveBankAccount(bankAccountId, ENTITY_TYPE, employeeId, userId);
}

module.exports = { findAllByEmployee, save, remove, setActive };
