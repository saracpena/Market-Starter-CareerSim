import express from "express";
import { getProduct, getProducts } from "#db/queries/products";


const router = express.Router();

/** Sends every product in the database. */
router.get("/", async (req, res, next) => {
  try {
    const products = await getProducts();

    res.send(products);
  } catch (error) {
    next(error);
  }
});

/** Sends one product matching the provided ID. */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await getProduct(id);

    if (!product) {
      return res.status(404).send({ message: "Product not found." });
    }

    res.send(product);
  } catch (error) {
    next(error);
  }
});

export default router;