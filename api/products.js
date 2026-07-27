import express from "express";
import { getProduct, getProducts, getProductOrders } from "#db/queries/products";
import requireUser from "#middleware/requireUser";

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

/**
 * Sends the logged-in user's orders that contain the specified product.
 */
router.get("/:id/orders", requireUser, async (req, res, next) => {
  try {
    const product = await getProduct(req.params.id);

    if (!product) {
      return res.status(404).send("Product not found.");
    }

    const orders = await getProductOrders(product.id, req.user.id);

    res.send(orders);
  } catch (error) {
    next(error);
  }
});

export default router;