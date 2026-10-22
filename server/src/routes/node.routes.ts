import { Router } from "express";
import {
  deleteNodeController,
  getNodesByParentNodeId,
  getQuickTargetsController,
  quickAddNodeController,
  saveNodesController,
} from "../controllers/node.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Быстрое добавление и получение целевых нод (авторизация по API-ключу в заголовке x-api-key или Bearer)
router.get("/quick-targets", getQuickTargetsController);
router.post("/quick-add", quickAddNodeController);

// Все остальные роуты требуют авторизации
router.use(authenticate);

router.get("/:nodeId", getNodesByParentNodeId); // вложенный desk
router.put("/saveNodes", saveNodesController); // сохранить
router.delete("/:id", deleteNodeController); // удалить
// router.put("/saveNode", saveNode); // сохранить

export default router;
