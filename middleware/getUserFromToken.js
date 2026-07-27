import { getUserById } from "#db/queries/users";
import { verifyToken } from "#utils/jwt";

// Identifies the user
/** Attaches the user to the request if a valid token is provided */
export default async function getUserFromToken(req, res, next) {
  const authorization = req.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) return next();

  const token = authorization.split(" ")[1];
  try {
  //retrieves the user ID from the payload.
    const { id } = verifyToken(token);
  //loads the complete user from PostgreSQL and attaches it to the request.
    const user = await getUserById(id);
    req.user = user;
    next();
  } catch (e) {
    console.error(e);
    res.status(401).send("Invalid token.");
  }
}
