# Market Backend Notes

## Project Layers

| Layer | Responsibility |
|---|---|
| `index.js` | Creates the Express application and connects the three routers |
| `api/users.js` | Handles registration and login requests |
| `api/products.js` | Handles product endpoints |
| `api/orders.js` | Handles order endpoints |
| `db/client.js` | Connects JavaScript to PostgreSQL |
| `db/schema.sql` | Creates the four tables and their relationships |
| `db/seed.js` | Inserts users, products, orders, and order-product records |
| Query files | Contain reusable SQL operations |
| Authentication middleware | Verifies tokens and identifies the logged-in user |

schema.sql defines the tables and relationships.
seed.js inserts the starter records.
client.js connects the JavaScript application to PostgreSQL.

## Database Relationships

### Users → Orders: One-to-Many

One user can make many orders.

One order belongs to one user.

The foreign key lives inside the `orders` table:

```sql
user_id INTEGER NOT NULL REFERENCES users(id)
```

This connects:

```text
orders.user_id → users.id
```

In plain English:

> The `user_id` in an order identifies the user who made that order.

---

### Orders ↔ Products: Many-to-Many

One order can contain many products.

One product can appear in many different orders.

This relationship cannot be represented with one simple foreign key, so we need a junction table:

```text
orders_products
```

The junction table connects:

```text
order_id   → orders.id
product_id → products.id
```

It also stores:

```text
quantity
```

`quantity` describes the relationship between one particular order and one particular product.

For example:

| order_id | product_id | quantity |
|---:|---:|---:|
| 1 | 4 | 3 |

Meaning:

> Order `1` contains three units of product `4`.

## Combined Primary Key

The junction table uses a combined primary key:

```sql
PRIMARY KEY (order_id, product_id)
```

This means the combination of `order_id` and `product_id` must be unique.

It prevents the same order-product combination from appearing in the table more than once.

For example, this is allowed:

| order_id | product_id | quantity |
|---:|---:|---:|
| 1 | 4 | 3 |
| 1 | 5 | 2 |

The same order can contain different products.

This would not be allowed:

| order_id | product_id | quantity |
|---:|---:|---:|
| 1 | 4 | 3 |
| 1 | 4 | 2 |

The combination `(1, 4)` appears twice.

Instead, the existing record should represent the total quantity:

| order_id | product_id | quantity |
|---:|---:|---:|
| 1 | 4 | 5 |

## Relationship Summary

```text
users
  │
  │ one user has many orders
  ▼
orders
  │
  │ many orders contain many products
  ▼
orders_products
  │
  │ connects each order to its products
  ▼
products
```

The key relationships are:

```text
users.id    → orders.user_id

orders.id   → orders_products.order_id

products.id → orders_products.product_id
```

### `getUserById()` Flow

`getUserFromToken.js` imports `getUserById()`.

```text
Receive an ID
    ↓
Place the ID into SQL parameter $1
    ↓
Search users.id
    ↓
Extract the first returned row
    ↓
Return the user or undefined