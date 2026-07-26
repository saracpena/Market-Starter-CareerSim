import db from "#db/client";
import bcrypt from "bcrypt"; //remember to encrypt our passwords
import db from "#db/client";

await db.connect(); //opens the database connection.
await seed(); //runs the function where we will insert the starter data.
await db.end(); //closes the connection after seeding finishes.
console.log("🌱 Database seeded.");

async function seed() {
  // 1. Create and retain the user
  const hashedPassword = await bcrypt.hash("SageyWagey", 10);

  const {
    rows: [user],
  } = await db.query(
    `
      INSERT INTO users (username, password)
      VALUES ($1, $2)
      RETURNING *;
    `,
    ["sara", hashedPassword],
  );

  console.log("Created user:", user.username);

const productData = [
  {
    title: "Resistance Bands",
    description:
      "A set of five resistance bands with different resistance levels.",
    price: 24.99,
  },
  {
    title: "Yoga Mat",
    description: "A cushioned non-slip mat for yoga and floor exercises.",
    price: 34.99,
  },
  {
    title: "Adjustable Dumbbells",
    description: "A pair of adjustable dumbbells for strength training.",
    price: 149.99,
  },
  {
    title: "Kettlebell",
    description:
      "A durable kettlebell for swings, squats, and strength exercises.",
    price: 44.99,
  },
  {
    title: "Foam Roller",
    description: "A high-density foam roller for muscle recovery and mobility.",
    price: 27.99,
  },
  {
    title: "Jump Rope",
    description: "An adjustable speed rope for cardio and conditioning.",
    price: 15.99,
  },
  {
    title: "Workout Bench",
    description: "An adjustable bench for strength and resistance training.",
    price: 119.99,
  },
  {
    title: "Lifting Straps",
    description: "Padded lifting straps for improved grip during heavy lifts.",
    price: 18.99,
  },
  {
    title: "Gym Bag",
    description:
      "A spacious gym bag with separate shoe and accessory compartments.",
    price: 39.99,
  },
  {
    title: "Stainless Steel Water Bottle",
    description:
      "An insulated water bottle for keeping drinks cold during workouts.",
    price: 22.99,
  },
];

// We retain createdProducts so we have the database-generated product IDs needed
// to connect those products to the seeded order through orders_products.
const createdProducts = [];

for (const product of productData) {
  const {
    rows: [createdProduct],
  } = await db.query(
    `
      INSERT INTO products (title, description, price)
      VALUES ($1, $2, $3)
      RETURNING *;
    `,
    [product.title, product.description, product.price],
  );

  createdProducts.push(createdProduct);
}

//This order belongs to that user.
const {
  rows: [order],
} = await db.query(
  `
    INSERT INTO orders (date, note, user_id)
    VALUES ($1, $2, $3)
    RETURNING *;
  `,
  ["2026-07-24", "Home gym essentials", user.id],
);

//User who has made at least 1 order of at least 5 distinct products.
const {
  rows: [order],
} = await db.query(
  `
    INSERT INTO orders (date, note, user_id)
    VALUES ($1, $2, $3)
    RETURNING *;
  `,
  ["2026-07-26", "Home gym essentials", user.id],
);

const orderProductData = [
  {
    productId: createdProducts[0].id,
    quantity: 2,
  },
  {
    productId: createdProducts[1].id,
    quantity: 1,
  },
  {
    productId: createdProducts[2].id,
    quantity: 1,
  },
  {
    productId: createdProducts[3].id,
    quantity: 2,
  },
  {
    productId: createdProducts[4].id,
    quantity: 1,
  },
];

for (const orderProduct of orderProductData) {
  await db.query(
    `
      INSERT INTO orders_products (order_id, product_id, quantity)
      VALUES ($1, $2, $3);
    `,
    [order.id, orderProduct.productId, orderProduct.quantity],
  );
}


// !Reminder:
/** seed.js needs client.js so its JavaScript can connect to PostgreSQL 
 and send the INSERT statements. */
//  * $ Prevents SQL Injection
// Return everything created in the row
