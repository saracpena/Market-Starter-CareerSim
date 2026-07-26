import express from "express";
const app = express();
export default app;

app.use(express.json()); //helps translate json req.body
