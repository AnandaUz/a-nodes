import { Router } from "express";
import {
  deleteNodeController,
  getNodesByParentNodeId,
  saveNodesController,
} from "../controllers/node.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Все роуты требуют авторизации
router.use(authenticate);

router.get("/:nodeId", getNodesByParentNodeId); // вложенный desk
router.put("/saveNodes", saveNodesController); // сохранить
router.delete("/:id", deleteNodeController); // удалить
// router.put("/saveNode", saveNode); // сохранить

export default router;
