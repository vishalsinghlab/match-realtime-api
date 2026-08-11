import { Router } from "express";
import {
    createMatch,
    getMatches,
} from "./match.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireRole } from "../auth/role.middleware.js";

const router = Router();

router.get("/", getMatches);
router.post("/", requireAuth, requireRole("ADMIN"), createMatch);

export default router;