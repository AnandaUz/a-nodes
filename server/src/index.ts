import "./config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import telegramRoutes from "./routes/telegram.routes";
import nodeRoutes from "./routes/node.routes";
import { bot } from "./bot";

const app = express();

const port = process.env.PORT;

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/nodes", nodeRoutes);

// app.post("/api/telegram/webhook", async (req, res) => {
//   try {
//     await bot.handleUpdate(req.body, res);
//   } catch (err) {
//     console.error("Webhook error:", err);
//     res.status(200).send("ok");
//   }
// });
// app.use("/api/telegram", telegramRoutes);

connectDB();

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
