# Market Backend Connection Flows

This guide documents how every major file, middleware function, query, and API route in the Market application connects.

The goal is to answer four questions throughout the project:

1. Where does the incoming information originate?
2. Which file handles it next?
3. Which database query is executed?
4. What response returns to the client?

---

## Table of Contents

- [Complete Application Architecture](#complete-application-architecture)
- [Project Structure](#project-structure)
- [Database Setup Flow](#database-setup-flow)
- [Server Startup Flow](#server-startup-flow)
- [Express Application Wiring](#express-application-wiring)
- [JWT Utility Flows](#jwt-utility-flows)
- [Authentication Middleware Flows](#authentication-middleware-flows)
- [User Query Flows](#user-query-flows)
- [Product Query Flows](#product-query-flows)
- [Order Query Flows](#order-query-flows)
- [Users Router Flows](#users-router-flows)
- [Products Router Flows](#products-router-flows)
- [Orders Router Flows](#orders-router-flows)
- [Junction Table and JOIN Flows](#junction-table-and-join-flows)
- [Status Code Decision Guide](#status-code-decision-guide)
- [Complete Route-to-Query Map](#complete-route-to-query-map)
- [Core Mental Model](#core-mental-model)

---

## Complete Application Architecture

Every normal request follows this general path:

```text
Client sends HTTP request
        ↓
app.js receives request
        ↓
Application middleware runs
        ↓
The correct API router matches the method and path
        ↓
Route middleware validates authentication or request data
        ↓
Route handler reads req.body, req.params, or req.user
        ↓
Route calls a database query function
        ↓
Query function sends parameterized SQL through db/client.js
        ↓
PostgreSQL executes SQL and returns rows
        ↓
Query function returns data to route
        ↓
Route sends HTTP response to client
```

The layers are:

| Layer | Primary responsibility |
|---|---|
| `server.js` | Connects PostgreSQL and starts the HTTP server |
| `app.js` | Configures Express, middleware, and routers |
| `api/*.js` | Handles requests, responses, validation, and status codes |
| `middleware/*.js` | Performs reusable checks before route handlers |
| `db/queries/*.js` | Contains reusable SQL operations |
| `db/client.js` | Provides the JavaScript-to-PostgreSQL connection |
| `db/schema.sql` | Defines tables, columns, keys, and relationships |
| `db/seed.js` | Inserts initial application data |
| `utils/jwt.js` | Creates and verifies authentication tokens |

---

## Project Structure

```text
market/
├── app.js
├── server.js
├── api/
│   ├── users.js
│   ├── products.js
│   └── orders.js
├── db/
│   ├── client.js
│   ├── schema.sql
│   ├── seed.js
│   └── queries/
│       ├── users.js
│       ├── products.js
│       └── orders.js
├── middleware/
│   ├── getUserFromToken.js
│   ├── requireUser.js
│   └── requireBody.js
└── utils/
    └── jwt.js
```

---

## Database Setup Flow

### `schema.sql`

`schema.sql` creates the empty database structure.

```text
Run npm run db:schema
        ↓
psql opens db/schema.sql
        ↓
Drop child tables before parent tables
        ↓
Create parent tables before child tables
        ↓
PostgreSQL creates the empty structure
```

Creation order:

```text
users
  ↓
orders
  ↓
orders_products
  ↑
products
```

The safe creation sequence is:

```text
1. users
2. products
3. orders
4. orders_products
```

The safe drop sequence is reversed:

```text
1. orders_products
2. orders
3. products
4. users
```

Rule:

```text
CREATE: parents before children
DROP:   children before parents
```

### `seed.js`

`seed.js` inserts initial records into the tables created by `schema.sql`.

```text
Open database connection
        ↓
Create and retain user
        ↓
Create and retain ten products
        ↓
Create order with user.id
        ↓
Create junction records with order.id and product IDs
        ↓
Close database connection
```

Seed dependency flow:

```text
user.id
   ↓
orders.user_id

order.id
   ↓
orders_products.order_id

product.id
   ↓
orders_products.product_id
```

Why returned rows are retained:

```text
INSERT record
      ↓
PostgreSQL generates SERIAL id
      ↓
RETURNING * returns the complete record
      ↓
JavaScript retains the generated id
      ↓
Later inserts use that id as a foreign key
```

---

## Server Startup Flow

### `server.js`

```text
Run npm run dev
        ↓
Node loads variables from .env
        ↓
server.js imports app.js
        ↓
server.js imports db/client.js
        ↓
db.connect() opens PostgreSQL connection
        ↓
app.listen(PORT) starts HTTP server
```

The server uses:

```js
const PORT = process.env.PORT ?? 3000;
```

Meaning:

```text
Environment provides PORT? → use it
No PORT provided?          → use 3000
```

---

## Express Application Wiring

### `app.js`

`app.js` is the application traffic director.

```text
Create Express app
        ↓
Parse incoming JSON
        ↓
Look for an authenticated user
        ↓
Send /users requests to usersRouter
        ↓
Send /products requests to productsRouter
        ↓
Send /orders requests to ordersRouter
```

Conceptual wiring:

```js
app.use(express.json());
app.use(getUserFromToken);

app.use("/users", usersRouter);
app.use("/products", productsRouter);
app.use("/orders", ordersRouter);
```

Path combination examples:

| Base path in `app.js` | Path in router | Complete route |
|---|---|---|
| `/users` | `/register` | `POST /users/register` |
| `/products` | `/` | `GET /products` |
| `/products` | `/:id` | `GET /products/:id` |
| `/orders` | `/` | `GET /orders` |
| `/orders` | `/:id/products` | `GET /orders/:id/products` |

---

## JWT Utility Flows

### `createToken(payload)`

```text
Receive payload
      ↓
Example payload: { id: user.id }
      ↓
Sign payload using JWT_SECRET
      ↓
Set expiration to seven days
      ↓
Return token string
```

The token contains:

```text
header.payload.signature
```

The payload identifies the user:

```json
{
  "id": 2
}
```

### `verifyToken(token)`

```text
Receive token
      ↓
Verify signature with JWT_SECRET
      ↓
Confirm token was not altered
      ↓
Confirm token has not expired
      ↓
Return decoded payload
```

If any verification check fails:

```text
jwt.verify() throws an error
        ↓
getUserFromToken catches it
        ↓
Send 401 Invalid token
```

---

## Authentication Middleware Flows

### `getUserFromToken`

Purpose:

> Optionally identify the requester and attach the database user to `req.user`.

```text
Receive request
      ↓
Read Authorization header
      ↓
Header missing or not Bearer?
      ├── yes → call next() without req.user
      └── no
           ↓
Extract token after "Bearer "
           ↓
verifyToken(token)
           ↓
Extract id from token payload
           ↓
getUserById(id)
           ↓
Attach database user to req.user
           ↓
Call next()
```

Connection:

```text
Authorization header
        ↓
verifyToken()
        ↓
payload.id
        ↓
getUserById(id)
        ↓
req.user
```

Why a missing token does not immediately return `401`:

```text
Public route without token
        ↓
getUserFromToken calls next()
        ↓
Public route continues normally
```

Protected routes add `requireUser` afterward.

### `requireUser`

Purpose:

> Prevent unauthenticated requesters from entering protected route handlers.

```text
Receive request after getUserFromToken
        ↓
Does req.user exist?
      ├── no  → send 401 Unauthorized
      └── yes → call next()
```

Authentication chain:

```text
getUserFromToken
        ↓
req.user attached
        ↓
requireUser
        ↓
protected route handler
```

### `requireBody(fields)`

Purpose:

> Create middleware that requires specific fields in `req.body`.

Example:

```js
requireBody(["username", "password"])
```

Flow:

```text
Receive required field names
        ↓
Return configured middleware
        ↓
Does req.body exist?
      ├── no → 400 Request body is required
      └── yes
           ↓
Check every required field
           ↓
Any field missing?
      ├── yes → 400 Missing fields
      └── no  → next()
```

Common configurations:

| Route | Required fields |
|---|---|
| `POST /users/register` | `username`, `password` |
| `POST /users/login` | `username`, `password` |
| `POST /orders` | `date` |
| `POST /orders/:id/products` | `productId`, `quantity` |

---

## User Query Flows

### `getUserById(id)` Flow

Called by:

```text
middleware/getUserFromToken.js
```

Purpose:

> Convert the ID extracted from a valid token into the complete database user.

```text
Receive an ID
    ↓
Place the ID into SQL parameter $1
    ↓
Search users.id
    ↓
PostgreSQL returns rows array
    ↓
Extract the first returned row
    ↓
Return the user or undefined
```

Connection:

```text
getUserFromToken.js
        ↓ imports and calls
getUserById(id)
        ↓ queries
users table
        ↓ returns
req.user
```

### `createUser(username, password)` Flow

Called by:

```text
POST /users/register
```

Purpose:

> Hash a plain password and create a database user.

```text
Receive username and plain password
        ↓
bcrypt.hash(password, 10)
        ↓
Create hashedPassword
        ↓
Place username into SQL parameter $1
        ↓
Place hashedPassword into SQL parameter $2
        ↓
INSERT INTO users
        ↓
RETURNING * returns created user
        ↓
Extract first row
        ↓
Return created user to registration route
```

Password transformation:

```text
plain password
      ↓ bcrypt cost factor 10
one-way password hash
      ↓
stored in users.password
```

### `getUserByUsername(username)` Flow

Called by:

```text
POST /users/login
```

Purpose:

> Find the database user and stored password hash needed for login.

```text
Receive username
      ↓
Place username into SQL parameter $1
      ↓
Search users.username
      ↓
Extract first returned row
      ↓
Return user or undefined
```

Connection:

```text
Login request
      ↓
getUserByUsername(username)
      ↓
users table
      ↓
user.password hash
      ↓
bcrypt.compare()
```

---

## Product Query Flows

### `getProducts()` Flow

Called by:

```text
GET /products
```

```text
Run SELECT * FROM products
        ↓
Order records by id
        ↓
PostgreSQL returns rows array
        ↓
Return complete product array
```

Because the route expects many products:

```js
const { rows } = await db.query(sql);
```

### `getProduct(id)` Flow

Called by:

```text
GET /products/:id
POST /orders/:id/products
GET /products/:id/orders
```

```text
Receive product ID
        ↓
Place ID into SQL parameter $1
        ↓
Search products.id
        ↓
Extract first returned row
        ↓
Return product or undefined
```

Different callers use the result differently:

```text
GET /products/:id
undefined → 404

POST /orders/:id/products
undefined → 400 because productId is invalid

GET /products/:id/orders
undefined → 404
```

### `getProductOrders(productId, userId)` Flow

Called by:

```text
GET /products/:id/orders
```

Purpose:

> Return the logged-in user's orders that contain a particular product.

```text
Receive productId and userId
        ↓
Find orders_products rows matching productId
        ↓
JOIN orders_products.order_id to orders.id
        ↓
Filter orders.user_id to logged-in userId
        ↓
Return matching order array
```

Relationship followed:

```text
products.id
      ↓
orders_products.product_id
      ↓
orders_products.order_id
      ↓
orders.id
      ↓
orders.user_id
```

---

## Order Query Flows

### `getOrdersByUser(userId)` Flow

Called by:

```text
GET /orders
```

```text
Receive req.user.id as userId
        ↓
Place userId into SQL parameter $1
        ↓
Search orders.user_id
        ↓
Return every matching order
```

This returns an array because:

```text
One user can have many orders
```

### `createOrder(date, note, userId)` Flow

Called by:

```text
POST /orders
```

```text
req.body.date → $1
req.body.note → $2
req.user.id   → $3
        ↓
INSERT INTO orders
        ↓
RETURNING * retrieves created order
        ↓
Extract first row
        ↓
Return created order
```

Ownership connection:

```text
req.user.id
      ↓
orders.user_id
```

### `getOrder(id)` Flow

Called by:

```text
GET /orders/:id
POST /orders/:id/products
GET /orders/:id/products
```

```text
Receive order ID
        ↓
Place ID into SQL parameter $1
        ↓
Search orders.id
        ↓
Extract first returned row
        ↓
Return order or undefined
```

Why the query only searches by order ID:

```text
No returned order
      ↓
Route knows order does not exist
      ↓
Send 404
```

If the order exists, the route separately checks:

```text
order.user_id === req.user.id?
      ├── no  → 403
      └── yes → continue
```

If the SQL searched by both order ID and user ID, an empty result could not distinguish:

```text
Missing order → 404
Wrong owner   → 403
```

### `addProductToOrder(orderId, productId, quantity)` Flow

Called by:

```text
POST /orders/:id/products
```

```text
orderId   → $1 → orders_products.order_id
productId → $2 → orders_products.product_id
quantity  → $3 → orders_products.quantity
                    ↓
              INSERT junction row
                    ↓
              RETURNING *
                    ↓
        Return created relationship
```

The route validates both sides before calling this function:

```text
Order exists?
      ↓
User owns order?
      ↓
Product exists?
      ↓
Insert relationship
```

### `getOrderProducts(orderId)` Flow

Called by:

```text
GET /orders/:id/products
```

Purpose:

> Return actual product details rather than only junction-table IDs.

```text
Receive orderId
      ↓
Find orders_products rows where order_id = $1
      ↓
JOIN orders_products.product_id to products.id
      ↓
Combine product fields with quantity
      ↓
Return product array
```

Relationship followed:

```text
orders.id
      ↓
orders_products.order_id
      ↓
orders_products.product_id
      ↓
products.id
```

---

## Users Router Flows

### `POST /users/register`

Purpose:

> Create a new user and send an authentication token.

Input:

```json
{
  "username": "gymqueen",
  "password": "strongpassword"
}
```

Complete flow:

```text
POST /users/register
        ↓
express.json() parses req.body
        ↓
requireBody(["username", "password"])
        ↓
Read username and password from req.body
        ↓
createUser(username, password)
        ↓
bcrypt hashes password
        ↓
INSERT user into PostgreSQL
        ↓
Return created user
        ↓
createToken({ id: user.id })
        ↓
Send status 201 and token
```

Failure branch:

```text
Missing username or password
        ↓
requireBody sends 400
        ↓
createUser() never runs
```

### `POST /users/login`

Purpose:

> Verify existing credentials and send an authentication token.

```text
POST /users/login
        ↓
express.json() parses req.body
        ↓
requireBody(["username", "password"])
        ↓
getUserByUsername(username)
        ↓
User exists?
      ├── no → 401 Invalid credentials
      └── yes
           ↓
bcrypt.compare(plain password, stored hash)
           ↓
Password matches?
      ├── no → 401 Invalid credentials
      └── yes
           ↓
createToken({ id: user.id })
           ↓
Send status 200 and token
```

Why registration and login differ:

```text
Registration:
plain password → bcrypt.hash() → stored hash

Login:
plain password + stored hash → bcrypt.compare() → true or false
```

---

## Products Router Flows

### `GET /products`

```text
GET /products
      ↓
app.js sends request to productsRouter
      ↓
router.get("/") matches
      ↓
getProducts()
      ↓
SELECT all products
      ↓
Send product array with status 200
```

### `GET /products/:id`

Example:

```text
GET /products/4
```

```text
Express stores "4" in req.params.id
        ↓
getProduct(req.params.id)
        ↓
Product returned?
      ├── no  → 404 Product not found
      └── yes → send product with status 200
```

Input origin:

```text
Product ID → req.params.id
```

### `GET /products/:id/orders`

Purpose:

> Return the logged-in user's orders that contain the requested product.

```text
GET /products/6/orders + Bearer token
        ↓
getUserFromToken attaches req.user
        ↓
requireUser
        ↓
getProduct(req.params.id)
        ↓
Product missing? → 404
        ↓
getProductOrders(product.id, req.user.id)
        ↓
JOIN orders with orders_products
        ↓
Filter to product and logged-in user
        ↓
Send order array with status 200
```

Input origins:

```text
productId → req.params.id
userId    → req.user.id
```

---

## Orders Router Flows

### `GET /orders`

Purpose:

> Return all orders belonging to the logged-in user.

```text
GET /orders + Bearer token
        ↓
getUserFromToken attaches req.user
        ↓
requireUser
        ↓
getOrdersByUser(req.user.id)
        ↓
SELECT orders WHERE user_id = $1
        ↓
Send order array with status 200
```

Failure:

```text
No valid authenticated user
        ↓
requireUser sends 401
```

### `POST /orders`

Purpose:

> Create a new order belonging to the logged-in user.

Input:

```json
{
  "date": "2026-07-27",
  "note": "Mobility and recovery equipment"
}
```

```text
POST /orders + Bearer token
        ↓
getUserFromToken attaches req.user
        ↓
requireUser
        ↓
requireBody(["date"])
        ↓
Read date and optional note from req.body
        ↓
Read user ID from req.user.id
        ↓
createOrder(date, note, req.user.id)
        ↓
INSERT order
        ↓
Send created order with status 201
```

Input origins:

```text
date   → req.body.date
note   → req.body.note
userId → req.user.id
```

### `GET /orders/:id`

Purpose:

> Return one order only if it exists and belongs to the logged-in user.

```text
GET /orders/2 + Bearer token
        ↓
requireUser
        ↓
getOrder(req.params.id)
        ↓
Order missing?
      ├── yes → 404
      └── no
           ↓
Does order.user_id equal req.user.id?
      ├── no  → 403
      └── yes → send order with status 200
```

Two different IDs:

```text
req.params.id → Which order is requested?
req.user.id   → Which user is requesting it?
```

### `POST /orders/:id/products`

Purpose:

> Add a quantity of a valid product to an order owned by the logged-in user.

Input:

```json
{
  "productId": 6,
  "quantity": 2
}
```

Complete validation ladder:

```text
POST /orders/2/products + Bearer token
        ↓
requireUser
        ↓
requireBody(["productId", "quantity"])
        ↓
getOrder(req.params.id)
        ↓
Order missing? → 404
        ↓
Wrong owner? → 403
        ↓
getProduct(req.body.productId)
        ↓
Product missing? → 400
        ↓
addProductToOrder(order.id, product.id, quantity)
        ↓
INSERT into orders_products
        ↓
Send junction record with status 201
```

Input origins:

```text
orderId   → req.params.id
userId    → req.user.id
productId → req.body.productId
quantity  → req.body.quantity
```

### `GET /orders/:id/products`

Purpose:

> Return the actual products contained in an order owned by the logged-in user.

```text
GET /orders/2/products + Bearer token
        ↓
requireUser
        ↓
getOrder(req.params.id)
        ↓
Order missing? → 404
        ↓
Wrong owner? → 403
        ↓
getOrderProducts(order.id)
        ↓
JOIN products with orders_products
        ↓
Include quantity from junction table
        ↓
Send product array with status 200
```

---

## Junction Table and JOIN Flows

### Why `orders_products` exists

```text
One order can contain many products
One product can appear in many orders
```

This is a many-to-many relationship:

```text
orders → orders_products ← products
```

The junction table stores:

| Column | Meaning |
|---|---|
| `order_id` | Which order? |
| `product_id` | Which product? |
| `quantity` | How many of this product? |

Example:

| order_id | product_id | quantity |
|---:|---:|---:|
| 2 | 6 | 2 |

Meaning:

```text
Order 2 contains two units of Product 6.
```

### Combined primary key

```sql
PRIMARY KEY (order_id, product_id)
```

This prevents the same order-product pair from appearing more than once.

The two columns have two roles:

| Column | Foreign-key role | Primary-key role |
|---|---|---|
| `order_id` | References `orders.id` | Helps identify the unique pair |
| `product_id` | References `products.id` | Helps identify the unique pair |

### Junction table versus JOIN

```text
Junction table
Stores the relationships as IDs

JOIN
Follows those IDs to retrieve useful combined information
```

### Order to products JOIN

Question:

> Which products belong to this order?

```text
order.id
    ↓
orders_products.order_id
    ↓
orders_products.product_id
    ↓
products.id
```

### Product to orders JOIN

Question:

> Which of this user's orders contain this product?

```text
product.id
    ↓
orders_products.product_id
    ↓
orders_products.order_id
    ↓
orders.id
    ↓
orders.user_id
```

---

## Status Code Decision Guide

| Status | Meaning in Market | Example |
|---:|---|---|
| `200` | Request succeeded | Login, retrieve products or orders |
| `201` | New record created | Register user, create order, add product |
| `400` | Request data is missing or invalid | Missing field, invalid `productId` |
| `401` | User is not authenticated | Missing or invalid token |
| `403` | User is authenticated but not allowed | User requests another user's order |
| `404` | Requested resource does not exist | Missing product or order |

### Authentication versus authorization

```text
401 Authentication question:
"Who are you? I cannot verify a logged-in user."

403 Authorization question:
"I know who you are, but you do not own this resource."
```

### Common order-resource decision ladder

```text
Is user authenticated?
      ├── no → 401
      └── yes
           ↓
Does resource exist?
      ├── no → 404
      └── yes
           ↓
Does user own resource?
      ├── no → 403
      └── yes → continue
```

---

## Complete Route-to-Query Map

| HTTP route | Middleware | Database functions | Response |
|---|---|---|---|
| `POST /users/register` | `requireBody` | `createUser` | `201` + token |
| `POST /users/login` | `requireBody` | `getUserByUsername` | `200` + token or `401` |
| `GET /products` | None required | `getProducts` | Product array |
| `GET /products/:id` | None required | `getProduct` | Product or `404` |
| `GET /products/:id/orders` | `requireUser` | `getProduct`, `getProductOrders` | User's order array |
| `GET /orders` | `requireUser` | `getOrdersByUser` | User's order array |
| `POST /orders` | `requireUser`, `requireBody` | `createOrder` | `201` + order |
| `GET /orders/:id` | `requireUser` | `getOrder` | Order, `403`, or `404` |
| `POST /orders/:id/products` | `requireUser`, `requireBody` | `getOrder`, `getProduct`, `addProductToOrder` | `201` + junction row |
| `GET /orders/:id/products` | `requireUser` | `getOrder`, `getOrderProducts` | Product array |

---

## Core Mental Model

### Files

```text
server.js
Starts the server
        ↓
app.js
Configures middleware and connects routers
        ↓
api/*.js
Handles req, res, validation, and status codes
        ↓
db/queries/*.js
Executes reusable SQL operations
        ↓
db/client.js
Connects JavaScript to PostgreSQL
        ↓
PostgreSQL
Stores and returns relational data
```

### Information sources

```text
req.params
Information embedded in the URL
Example: /orders/:id

req.body
Information sent as JSON
Example: date, note, productId, quantity

req.user
Authenticated user attached by token middleware
Example: req.user.id

req headers
Bearer token used to identify the requester
```

### Database keys

```text
Primary key
"Who am I?"
Identifies a row in its own table

Foreign key
"Who do I belong to?"
Connects a row to another table

Combined primary key
"Is this relationship pair unique?"
Identifies one order-product pairing
```

### Final application flow

```text
Request
  → application middleware
  → resource router
  → route middleware
  → query function
  → parameterized SQL
  → PostgreSQL
  → returned rows
  → route decision
  → HTTP response
```

The goal is to move from:

> “I recognize this code.”

to:

> “I understand where the information comes from, which file owns the next step, which query runs, and why the route returns that status.”


# Market Backend Guide

This document tracks how the Market backend is structured, how information travels through the application, and how each route connects to PostgreSQL.

## Quick Project Reference

| Layer | Responsibility |
|---|---|
| `server.js` | Connects to PostgreSQL and starts the HTTP server |
| `app.js` | Creates Express, adds application middleware, and connects the three routers |
| `api/users.js` | Handles registration and login requests |
| `api/products.js` | Handles product-related requests and responses |
| `api/orders.js` | Handles protected order requests and responses |
| `middleware/` | Validates request bodies, identifies users, and protects routes |
| `utils/jwt.js` | Creates and verifies authentication tokens |
| `db/client.js` | Connects JavaScript to PostgreSQL |
| `db/schema.sql` | Defines the four tables and their relationships |
| `db/seed.js` | Inserts the initial users, products, orders, and junction records |
| `db/queries/` | Contains reusable SQL functions called by the API routers |

## Database File Distinction

```text
schema.sql
Defines the tables, columns, keys, rules, and relationships.

seed.js
Inserts the initial records that follow the schema.

client.js
Provides the connection that allows JavaScript to communicate with PostgreSQL.

db/queries/*.js
Uses client.js to execute reusable SQL operations.

  