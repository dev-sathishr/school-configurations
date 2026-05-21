const db = require('../../../config/database');

async function findBySlug(doctypeSlug) {
  const result = await db.query(`
    SELECT w.id, w.doctype_slug, w.states, w.is_active,
           json_agg(t ORDER BY t.from_state, t.action_label) AS transitions
    FROM engine.workflow_defs w
    LEFT JOIN engine.workflow_transitions t ON t.workflow_id = w.id AND t.deleted_at IS NULL
    WHERE w.doctype_slug = $1 AND w.deleted_at IS NULL
    GROUP BY w.id
  `, [doctypeSlug]);
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  row.transitions = (row.transitions || []).filter(Boolean);
  return row;
}

async function findById(id) {
  const result = await db.query(`
    SELECT w.id, w.doctype_slug, w.states, w.is_active,
           json_agg(t ORDER BY t.from_state, t.action_label) AS transitions
    FROM engine.workflow_defs w
    LEFT JOIN engine.workflow_transitions t ON t.workflow_id = w.id AND t.deleted_at IS NULL
    WHERE w.id = $1 AND w.deleted_at IS NULL
    GROUP BY w.id
  `, [id]);
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  row.transitions = (row.transitions || []).filter(Boolean);
  return row;
}

async function upsert(doctypeSlug, { states, transitions, is_active }, userId) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert workflow definition
    const existing = await client.query(
      `SELECT id FROM engine.workflow_defs WHERE doctype_slug = $1 AND deleted_at IS NULL`,
      [doctypeSlug]
    );

    let workflowId;
    if (existing.rows.length > 0) {
      workflowId = existing.rows[0].id;
      await client.query(
        `UPDATE engine.workflow_defs SET states=$1, is_active=$2, updated_by=$3, updated_at=NOW() WHERE id=$4`,
        [JSON.stringify(states), is_active ?? true, userId, workflowId]
      );
    } else {
      const res = await client.query(
        `INSERT INTO engine.workflow_defs (doctype_slug, states, is_active, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $4) RETURNING id`,
        [doctypeSlug, JSON.stringify(states), is_active ?? true, userId]
      );
      workflowId = res.rows[0].id;
    }

    // Replace all transitions: soft-delete old, insert new
    await client.query(
      `UPDATE engine.workflow_transitions SET deleted_at=NOW(), deleted_by=$1 WHERE workflow_id=$2 AND deleted_at IS NULL`,
      [userId, workflowId]
    );
    for (const t of (transitions || [])) {
      await client.query(
        `INSERT INTO engine.workflow_transitions
           (workflow_id, from_state, to_state, action_label, allowed_roles, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$6)`,
        [workflowId, t.from_state, t.to_state, t.action_label,
         Array.isArray(t.allowed_roles) ? t.allowed_roles : [], userId]
      );
    }

    await client.query('COMMIT');
    return workflowId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function softDelete(doctypeSlug, userId) {
  await db.query(
    `UPDATE engine.workflow_defs SET deleted_at=NOW(), deleted_by=$1 WHERE doctype_slug=$2 AND deleted_at IS NULL`,
    [userId, doctypeSlug]
  );
}

// Get current workflow_state of a record
async function getRecordState(schemaName, slug, recordId) {
  const result = await db.query(
    `SELECT workflow_state FROM "${schemaName}"."${slug}" WHERE id=$1 AND deleted_at IS NULL`,
    [recordId]
  );
  return result.rows[0]?.workflow_state ?? null;
}

// Set workflow_state on a record + log the transition
async function applyTransition(schemaName, slug, recordId, toState, userId) {
  await db.query(
    `UPDATE "${schemaName}"."${slug}" SET workflow_state=$1, updated_by=$2, updated_at=NOW() WHERE id=$3`,
    [toState, userId, recordId]
  );
}

module.exports = { findBySlug, findById, upsert, softDelete, getRecordState, applyTransition };
