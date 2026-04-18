const db = require('../../../config/database');

async function findByUserId(userId) {
  const result = await db.query(
    'SELECT data, updated_at FROM settings.user_preferences WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

async function upsert(userId, data) {
  const result = await db.query(
    `INSERT INTO settings.user_preferences (user_id, data, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET data = EXCLUDED.data, updated_at = NOW()
     RETURNING data, updated_at`,
    [userId, JSON.stringify(data)]
  );
  return result.rows[0];
}

async function trackIncrement(userId, type, id) {
  // type: 'menus' | 'modules'  (path segment under usage)
  // Atomically increments usage.<type>.<id>.count and sets lastAccessed.
  // Uses jsonb_set with create-if-missing to handle fresh users/paths.
  const result = await db.query(
    `INSERT INTO settings.user_preferences (user_id, data, updated_at)
     VALUES (
       $1,
       jsonb_build_object('usage', jsonb_build_object($2::text, jsonb_build_object($3::text, jsonb_build_object('count', 1, 'lastAccessed', to_jsonb(NOW()))))),
       NOW()
     )
     ON CONFLICT (user_id) DO UPDATE SET
       data = jsonb_set(
         jsonb_set(
           jsonb_set(
             COALESCE(settings.user_preferences.data, '{}'::jsonb),
             ARRAY['usage'],
             COALESCE(settings.user_preferences.data -> 'usage', '{}'::jsonb),
             true
           ),
           ARRAY['usage', $2::text],
           COALESCE(settings.user_preferences.data -> 'usage' -> $2::text, '{}'::jsonb),
           true
         ),
         ARRAY['usage', $2::text, $3::text],
         jsonb_build_object(
           'count', COALESCE((settings.user_preferences.data #> ARRAY['usage', $2::text, $3::text, 'count'])::int, 0) + 1,
           'lastAccessed', to_jsonb(NOW())
         ),
         true
       ),
       updated_at = NOW()
     RETURNING data`,
    [userId, type, id]
  );
  return result.rows[0];
}

module.exports = { findByUserId, upsert, trackIncrement };
