import express from "express";
import { getOrdersByUser, createOrder } from "#db/queries/orders";
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

export default router;
