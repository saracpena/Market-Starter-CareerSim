import db from "#db/client";
import bcrypt from "bcrypt";

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

/**
 * Hashes the provided password and creates a new user.
 * Called by POST /users/register.
 * Returns the newly created user.
 */
export async function createUser(username, password) {
//Hash this password using bcrypt with a cost factor of 10.
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = `
    INSERT INTO users (username, password)
    VALUES ($1, $2)
    RETURNING *;
  `;

  const {
    rows: [user],
  } = await db.query(sql, [username, hashedPassword]);

  return user;
}

/**
 * Finds a user by username.
 * Called by POST /users/login.
 * Returns the matching user, or undefined if no user exists.
 */
export async function getUserByUsername(username) {
  const sql = `
    SELECT *
    FROM users
    WHERE username = $1;
  `;

  const {
    rows: [user],
  } = await db.query(sql, [username]);

  return user;
}