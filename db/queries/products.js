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