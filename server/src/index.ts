import "./config";
import express from "express";
import cors from "cors";
import { connectDB, isDbReady, waitForDb } from "./db";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import nodeRoutes from "./routes/node.routes";

const app = express();

const port = process.env.PORT;

const allowedOrigins = process.env.CLIENT_URL?.split(",") || [];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.text());

app.use(async (_req, res, next) => {
  if (isDbReady() || (await waitForDb(6000))) return next();
  res.status(503).json({
    error: "DB_UNAVAILABLE",
    message: "База данных недоступна. Проверьте IP whitelist в MongoDB Atlas.",
  });
});

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/nodes", nodeRoutes);

const start = async () => {
  await connectDB();
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
};

start();
