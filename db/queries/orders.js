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

/**
 * Returns one order matching the provided ID.
 * Used to distinguish a missing order from an order owned by another user.
 */
export async function getOrder(id) {
  const sql = `
    SELECT *
    FROM orders
    WHERE id = $1;
  `;

  const {
    rows: [order],
  } = await db.query(sql, [id]);

  return order;
}

/**
 * Connects a product to an order through the orders_products junction table.
 * Called by POST /orders/:id/products.
 */
export async function addProductToOrder(orderId, productId, quantity) {
  const sql = `
    INSERT INTO orders_products (order_id, product_id, quantity)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const {
    rows: [orderProduct],
  } = await db.query(sql, [orderId, productId, quantity]);

  return orderProduct;
}

/**
 * Returns the products included in a specified order.
 * Joins products with orders_products and includes the ordered quantity.
 */
export async function getOrderProducts(orderId) {
  const sql = `
    SELECT products.*, orders_products.quantity
    FROM products
    JOIN orders_products
      ON products.id = orders_products.product_id
    WHERE orders_products.order_id = $1
    ORDER BY products.id;
  `;

  const { rows } = await db.query(sql, [orderId]);

  return rows;
}