import "./config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db";
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

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/nodes", nodeRoutes);

connectDB();

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
