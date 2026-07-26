import express from "express";
import productsRouter from "#api/products";
const app = express();

app.use(express.json()); //helps translate json req.body

app.use("/products", productsRouter);

export default app;