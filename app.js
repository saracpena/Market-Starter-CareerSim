import express from "express";
import productsRouter from "#api/products";
import usersRouter from "#api/users";
import getUserFromToken from "#middleware/getUserFromToken";
import ordersRouter from "#api/orders";

const app = express();
app.use(getUserFromToken);

app.use(express.json()); //helps translate json req.body

app.use("/products", productsRouter);
app.use("/users", usersRouter);
app.use("/orders", ordersRouter);

export default app;