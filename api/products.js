import e from "express";
import { getProducts } from "#db/products";

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

export default router;