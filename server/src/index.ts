import "./config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { connectDB, isDbReady, waitForDb } from "./db";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import nodeRoutes from "./routes/node.routes";
import { runDailyBackup } from "./services/backup.service";

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

app.use(express.json({ limit: "1mb" }));
app.use(express.text({ limit: "1mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много запросов авторизации, попробуйте позже" },
});

const quickApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Превышен лимит запросов к quick-API" },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много запросов, попробуйте позже" },
});

app.use(async (_req, res, next) => {
  if (isDbReady() || (await waitForDb(6000))) return next();
  res.status(503).json({
    error: "DB_UNAVAILABLE",
    message: "База данных недоступна. Проверьте IP whitelist в MongoDB Atlas.",
  });
});

app.use("/api/auth", authLimiter);
app.use("/nodes/quick-add", quickApiLimiter);
app.use("/nodes/quick-targets", quickApiLimiter);
app.use("/api", apiLimiter);
app.use("/nodes", apiLimiter);

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/nodes", nodeRoutes);

const start = async () => {
  await connectDB();
  runDailyBackup().catch((err) => console.error("[backup] Ошибка фонового бэкапа:", err));
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
};

start();
