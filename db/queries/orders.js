import db from "#db/client";

/**
 * Returns every order belonging to the specified user.
 * Called by GET /orders with req.user.id.
 */
export async function getOrdersByUser(userId) {
  const sql = `
    SELECT *
    FROM orders
    WHERE user_id = $1
    ORDER BY id;
  `;

  const { rows } = await db.query(sql, [userId]);

  return rows;
}

/**
 * Creates an order belonging to the specified user.
 * Called by POST /orders.
 */
export async function createOrder(date, note, userId) {
  const sql = `
    INSERT INTO orders (date, note, user_id)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const {
    rows: [order],
  } = await db.query(sql, [date, note, userId]);

  return order;
}