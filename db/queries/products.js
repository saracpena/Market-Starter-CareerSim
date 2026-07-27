import db from "#db/client";

/** Returns every product in the database. */
export async function getProducts() {
  const sql = `
    SELECT *
    FROM products
    ORDER BY id;
  `;

  const { rows } = await db.query(sql);

  return rows;
}

/** Returns one product matching the provided ID. */
export async function getProduct(id) {
  const sql = `
    SELECT *
    FROM products
    WHERE id = $1;
  `;

  const {
    rows: [product],
  } = await db.query(sql, [id]);

  return product;
}

/**
 * Returns the logged-in user's orders that contain a specified product.
 * Called by GET /products/:id/orders.
 */
export async function getProductOrders(productId, userId) {
  const sql = `
    SELECT orders.*
    FROM orders
    JOIN orders_products
      ON orders.id = orders_products.order_id
    WHERE orders_products.product_id = $1
      AND orders.user_id = $2
    ORDER BY orders.id;
  `;

  const { rows } = await db.query(sql, [productId, userId]);

  return rows;
}