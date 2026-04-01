import express from "express";
import { getDbConnection } from "../lib/db.ts";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const db = await getDbConnection();
    const result = await db.request()
      .query(`SELECT ToolId, ToolName, DisplayName, Description, AuthType FROM Tools WHERE IsActive = 1`);
    res.json(result.recordset);
  } catch (err: any) {
    console.error("🔥 Lỗi lấy tools:", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;