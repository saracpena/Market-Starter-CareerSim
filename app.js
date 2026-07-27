import express from "express";
import productsRouter from "#api/products";
import usersRouter from "#api/users";
const app = express();

app.use(express.json()); //helps translate json req.body

app.use("/products", productsRouter);
app.use("/users", usersRouter);

export default app;