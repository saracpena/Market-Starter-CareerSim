import express from "express";
import { createUser } from "#db/queries/users";
import requireBody from "#middleware/requireBody";
import { createToken } from "#utils/jwt";

const router = express.Router();

/**
 * Registers a new user and sends an authentication token.
 */
router.post(
  "/register",
  requireBody(["username", "password"]),
  async (req, res, next) => {
    try {
      const { username, password } = req.body;

      const user = await createUser(username, password);

      const token = createToken({ id: user.id });

      res.status(201).send(token);
    } catch (error) {
      next(error);
    }
  },
);

export default router;