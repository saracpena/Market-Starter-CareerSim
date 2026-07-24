-- TODO/DONE!
-- users
--   ↓ one-to-many
-- orders
--   ↓
-- orders_products
--   ↑
-- products

DROP TABLE IF EXISTS orders_products;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

-- Not NULL means REQUIRED
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL, 
  description TEXT NOT NULL,
  price DECIMAL NOT NULL
);


CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  note TEXT,
--  every order must belong to an existing user. && if a user is deleted, automatically delete that user’s orders as well.
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Junction Table must answer:
-- Which order? + Which product? + How many?
CREATE TABLE orders_products (
-- FK so, orders_products.order_id must match an existing orders.id.
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
--   FK and orders_products.product_id must match an existing products.id.
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id)
);

-- Additional Notes:
-- DROP TABLES in this order because PostgreSQL protects active references.
-- in other words, I cannot remove users because the orders table still depends on it.
-- 1. Remove orders_products
--    It depends on orders and products.

-- 2. Remove orders
--    It depends on users.

-- 3. Remove products and users
--    Nothing points to them anymore.