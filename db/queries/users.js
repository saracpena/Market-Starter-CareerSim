import db from "#db/client";

/**
 * Finds a user by ID.
 * Used by getUserFromToken after an ID is extracted from a valid token.
 * Returns the matching user, or undefined if no user exists.
 */
export async function getUserById(id) {
  const sql = `
    SELECT *
    FROM users
    WHERE id = $1;
  `;

  // The id argument replaces $1. Extract the first row as user.
  const {
    rows: [user],
  } = await db.query(sql, [id]);

  return user;
}