import { Router } from "express";
import {
  getNodesByParentNodeId,
  saveNodes,
  saveNode,
} from "../controllers/node.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Все роуты требуют авторизации
router.use(authenticate);

router.get("/:nodeId", getNodesByParentNodeId); // вложенный desk
router.put("/saveNodes", saveNodes); // сохранить
// router.put("/saveNode", saveNode); // сохранить

export default router;
