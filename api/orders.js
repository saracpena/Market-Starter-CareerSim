import express from "express";
import { getOrdersByUser, createOrder, getOrder, addProductToOrder, getOrderProducts} from "#db/queries/orders";
import { getProduct } from "#db/queries/products";
import requireBody from "#middleware/requireBody";
import requireUser from "#middleware/requireUser";

const router = express.Router();

/**
 * Sends every order belonging to the logged-in user.
 */
router.get("/", requireUser, async (req, res, next) => {
  try {
    const orders = await getOrdersByUser(req.user.id);

    res.send(orders);
  } catch (error) {
    next(error);
  }
});

/**
 * Creates an order belonging to the logged-in user.
 */
router.post("/", requireUser, requireBody(["date"]), async (req, res, next) => {
  try {
    const { date, note = null } = req.body;

    const order = await createOrder(date, note, req.user.id);

    res.status(201).send(order);
  } catch (error) {
    next(error);
  }
});

/**
 * Sends one order if it exists and belongs to the logged-in user.
 */
router.get("/:id", requireUser, async (req, res, next) => {
  try {
    const order = await getOrder(req.params.id);

    if (!order) {
      return res.status(404).send("Order not found.");
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).send("Forbidden");
    }

    res.send(order);
  } catch (error) {
    next(error);
  }
});

/**
 * Adds a product to an order owned by the logged-in user.
 */
router.post(
  "/:id/products",
  requireUser,
  requireBody(["productId", "quantity"]),
  async (req, res, next) => {
    try {
      const order = await getOrder(req.params.id);

      if (!order) {
        return res.status(404).send("Order not found.");
      }

      if (order.user_id !== req.user.id) {
        return res.status(403).send("Forbidden");
      }

      const { productId, quantity } = req.body;

      const product = await getProduct(productId);

      if (!product) {
        return res.status(400).send("Product does not exist.");
      }

      const orderProduct = await addProductToOrder(
        order.id,
        product.id,
        quantity,
      );

      res.status(201).send(orderProduct);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Sends the products from an order owned by the logged-in user.
 */
router.get("/:id/products", requireUser, async (req, res, next) => {
  try {
    const order = await getOrder(req.params.id);

    if (!order) {
      return res.status(404).send("Order not found.");
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).send("Forbidden");
    }

    const products = await getOrderProducts(order.id);

    res.send(products);
  } catch (error) {
    next(error);
  }
});

export default router;
