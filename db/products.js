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