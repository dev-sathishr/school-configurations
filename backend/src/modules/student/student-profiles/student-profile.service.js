const profileRepo = require('./student-profile.repository');
const relationRepo = require('../../employee/employee-info/employee-family/relation.repository');
const fileRepo = require('../../files/file.repository');
const { validate } = require('../../../shared/helpers/validate.helper');
const { getUserLocationScope, assertLocationAllowed } = require('../../../shared/helpers/location-scope.helper');
const userRepo = require('../../settings/users/user.repository');
const { saveAddresses, getAddresses } = require('../../../shared/helpers/address.helper');

const ENTITY_TYPE = 'student_profile';

function normalizeAddressPart(value) {
  return String(value || '').trim().toLowerCase();
}

function comparableAddress(addr) {
  return {
    address_line1: normalizeAddressPart(addr.address_line1),
    address_line2: normalizeAddressPart(addr.address_line2),
    pincode: normalizeAddressPart(addr.pincode),
    post_office: normalizeAddressPart(addr.post_office),
    city: normalizeAddressPart(addr.city),
    state: normalizeAddressPart(addr.state),
    country: normalizeAddressPart(addr.country || 'India'),
  };
}

function areSameAddress(left, right) {
  const a = comparableAddress(left);
  const b = comparableAddress(right);
  return (
    a.address_line1 === b.address_line1 &&
    a.address_line2 === b.address_line2 &&
    a.pincode === b.pincode &&
    a.post_office === b.post_office &&
    a.city === b.city &&
    a.state === b.state &&
    a.country === b.country
  );
}

function withReusedParentAddressIds(body, createdFamily) {
  const studentAddresses = Array.isArray(body.addresses) ? body.addresses : [];
  if (!studentAddresses.length) return studentAddresses;

  const sameAsParent = body.same_as_parent === true || body.same_as_parent === 'true';
  if (!sameAsParent) return studentAddresses;

  const sourceIndex = Number.parseInt(String(body.same_as_parent_source_index), 10);
  if (!Number.isInteger(sourceIndex)) return studentAddresses;

  const source = createdFamily.find((member) => member.index === sourceIndex);
  if (!source?.saved_addresses?.length || !source.source_addresses?.length) return studentAddresses;

  return studentAddresses.map((studentAddr, idx) => {
    const sourceSavedAddr = source.saved_addresses[idx];
    const sourceInputAddr = source.source_addresses[idx];
    if (!sourceSavedAddr || !sourceInputAddr) return studentAddr;
    if (!areSameAddress(studentAddr, sourceInputAddr)) return studentAddr;
    return { ...studentAddr, id: sourceSavedAddr.id };
  });
}

async function saveFamilyMembers(profileId, members, userId) {
  if (!members || !Array.isArray(members) || members.length === 0) return { data: [] };
  const emergencyCount = members.filter(m => m.is_emergency_contact).length;
  if (emergencyCount > 1) {
    return { error: 'badRequest', message: 'Only one family member can be marked as emergency contact' };
  }

  const created = [];
  for (let i = 0; i < members.length; i += 1) {
    const m = members[i];
    let row;
    if (m._linked && m.relation_id) {
      // Existing shared relation — only insert a mapping row, never touch settings.relations
      row = await relationRepo.createMapping(ENTITY_TYPE, profileId, m.relation_id, m, userId);
      // Addresses already belong to the shared relation; no re-save needed
      created.push({ index: i, relation_id: row.relation_id, source_addresses: [], saved_addresses: [] });
    } else {
      row = await relationRepo.create(ENTITY_TYPE, profileId, m, userId);
      let savedAddresses = [];
      if (m.addresses?.length) {
        savedAddresses = await saveAddresses('relation', row.relation_id, m.addresses, userId);
      }
      created.push({
        index: i,
        relation_id: row.relation_id,
        source_addresses: Array.isArray(m.addresses) ? m.addresses : [],
        saved_addresses: savedAddresses,
      });
    }
  }
  return { data: created };
}

async function syncFamilyMembers(profileId, members, userId) {
  if (!Array.isArray(members)) return { data: [] };

  const emergencyCount = members.filter(m => m.is_emergency_contact).length;
  if (emergencyCount > 1) {
    return { error: 'badRequest', message: 'Only one family member can be marked as emergency contact' };
  }

  const existing = await relationRepo.findAllByEntity(ENTITY_TYPE, profileId);
  const existingById = new Map(existing.map((row) => [row.id, row]));
  const keepIds = new Set();

  for (const m of members) {
    let mappingId = null;
    let relationId = null;
    const isLinked = !!(m._linked || m.is_linked);

    if (m.id && existingById.has(m.id)) {
      const current = existingById.get(m.id);
      if (isLinked || current.is_linked) {
        // Linked member — only update mapping fields, never touch shared relation row
        const updated = await relationRepo.updateMappingOnly(m.id, m, userId);
        if (!updated) return { error: 'notFound', message: 'Relation record not found' };
      } else {
        const updated = await relationRepo.update(m.id, m, userId);
        if (!updated) return { error: 'notFound', message: 'Relation record not found' };
        relationId = current.relation_id;
        if (relationId && Array.isArray(m.addresses)) {
          await saveAddresses('relation', relationId, m.addresses, userId);
        }
      }
      mappingId = m.id;
    } else if (isLinked && m.relation_id) {
      // New linked member — only create mapping row
      const created = await relationRepo.createMapping(ENTITY_TYPE, profileId, m.relation_id, m, userId);
      mappingId = created.id;
    } else {
      const created = await relationRepo.create(ENTITY_TYPE, profileId, m, userId);
      mappingId = created.id;
      relationId = created.relation_id;
      if (relationId && Array.isArray(m.addresses)) {
        await saveAddresses('relation', relationId, m.addresses, userId);
      }
    }

    if (mappingId) keepIds.add(mappingId);
  }

  for (const row of existing) {
    if (!keepIds.has(row.id)) {
      await relationRepo.softDelete(row.id, userId);
    }
  }

  return { data: [] };
}

const PROFILE_RULES = {
  first_name:           { required: true, min: 2, max: 100, label: 'First Name' },
  middle_name:          { max: 100,                    label: 'Middle Name' },
  last_name:            { max: 100,                    label: 'Last Name' },
  dob:                  {                              label: 'Date of Birth' },
  gender:               {                              label: 'Gender' },
  aadhaar_no:           { max: 12,                     label: 'Aadhaar Number' },
  nationality:          { max: 100,                    label: 'Nationality' },
  birth_place:          { max: 100,                    label: 'Birth Place' },
  primary_contact_no:   { max: 20,                     label: 'Contact Number' },
  email:                { max: 100, email: true,        label: 'Email' },
  notes:                { max: 500,                    label: 'Notes' },
};

async function getAll(query, userId) {
  const scope = await getUserLocationScope(userId);
  return profileRepo.findAll(query, scope);
}

async function getById(id, userId) {
  const scope = await getUserLocationScope(userId);
  const profile = await profileRepo.findById(id, scope);
  if (!profile) return { error: 'notFound', message: 'Student profile not found' };
  const [addresses, familyRows, photo] = await Promise.all([
    getAddresses(ENTITY_TYPE, id),
    relationRepo.findAllByEntity(ENTITY_TYPE, id),
    fileRepo.findOneByEntity(ENTITY_TYPE, id, 'photo'),
  ]);

  const family = await Promise.all(
    familyRows.map(async (member) => {
      const relationAddresses = await getAddresses('relation', member.relation_id);
      return { ...member, addresses: relationAddresses };
    })
  );

  return { data: { ...profile, addresses, family, photo: photo || null } };
}

async function resolveLocationId(userId) {
  const rows = await userRepo.getUserLocations(userId);
  if (!rows.length) return null; // unrestricted (super admin) — no location to auto-assign
  const defaultRow = rows.find((r) => r.is_default) || rows[0];
  return defaultRow.id;
}

async function savePhoto(entityType, entityId, file, userId) {
  await fileRepo.softDeleteByEntity(entityType, entityId, 'photo', userId);
  await fileRepo.create({
    entity_type: entityType,
    entity_id:   entityId,
    file_type:   'photo',
    original_name: file.originalname,
    stored_name:   file.filename,
    mime_type:     file.mimetype,
    size:          file.size,
    path:          `uploads/${file.filename}`,
  }, userId);
}

async function create(body, file, userId) {
  const errors = validate(body, PROFILE_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  const locationId = body.location_id || (await resolveLocationId(userId));
  if (!locationId) return { error: 'badRequest', message: 'No location assigned to your account' };
  body = { ...body, location_id: locationId };

  const scope = await getUserLocationScope(userId);
  const scopeError = assertLocationAllowed(scope, body.location_id);
  if (scopeError) return scopeError;

  if (body.aadhaar_no) {
    const exists = await profileRepo.checkAadhaarUnique(body.aadhaar_no);
    if (exists) return { error: 'conflict', message: 'Aadhaar number is already registered' };
  }

  const id = await profileRepo.create(body, userId);

  let createdFamily = [];
  if (body.family?.length) {
    const familyResult = await saveFamilyMembers(id, body.family, userId);
    if (familyResult.error) { await profileRepo.softDelete(id, userId); return familyResult; }
    createdFamily = familyResult.data || [];
  }

  if (body.addresses?.length) {
    const addressesToSave = withReusedParentAddressIds(body, createdFamily);
    await saveAddresses(ENTITY_TYPE, id, addressesToSave, userId);
  }

  if (file) await savePhoto(ENTITY_TYPE, id, file, userId);
  return getById(id, userId);
}

async function update(id, body, file, userId) {
  const scope = await getUserLocationScope(userId);
  const current = await profileRepo.findById(id, scope);
  if (!current) return { error: 'notFound', message: 'Student profile not found' };

  const merged = { ...current, ...body };
  const errors = validate(merged, PROFILE_RULES);
  if (errors.length) return { error: 'badRequest', message: errors.join(', ') };

  if (body.aadhaar_no && body.aadhaar_no !== current.aadhaar_no) {
    const exists = await profileRepo.checkAadhaarUnique(body.aadhaar_no, id);
    if (exists) return { error: 'conflict', message: 'Aadhaar number is already registered' };
  }

  const updated = await profileRepo.update(id, body, userId);
  if (!updated) return { error: 'notFound', message: 'Student profile not found' };
  if (body.family && Array.isArray(body.family)) {
    const familyResult = await syncFamilyMembers(id, body.family, userId);
    if (familyResult.error) return familyResult;
  }
  if (body.addresses && Array.isArray(body.addresses)) await saveAddresses(ENTITY_TYPE, id, body.addresses, userId);
  if (file) await savePhoto(ENTITY_TYPE, id, file, userId);
  return getById(id, userId);
}

async function remove(id, userId) {
  const scope = await getUserLocationScope(userId);
  const current = await profileRepo.findById(id, scope);
  if (!current) return { error: 'notFound', message: 'Student profile not found' };
  await profileRepo.softDelete(id, userId);
  return {};
}

async function removeMultiple(ids, userId) {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return { error: 'badRequest', message: 'ids array is required' };
  }
  const scope = await getUserLocationScope(userId);
  const deletedCount = await profileRepo.softDeleteMultiple(ids, userId, scope);
  return { deleted_count: deletedCount };
}

module.exports = { getAll, getById, create, update, remove, removeMultiple };
