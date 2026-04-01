import express from "express";
import { getDbConnection, sql } from "../lib/db.ts";
import { authenticateToken } from "../middlewares/auth.ts";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const db = await getDbConnection();
    const result = await db.request()
      .query(`
        SELECT TemplateId, Title, Description, Status, Steps, ImageUrl, Category, CreatedAt
        FROM Templates
        ORDER BY CreatedAt DESC
      `);
    res.json(result.recordset);
  } catch (err: any) {
    console.error("🔥 Lỗi lấy templates:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDbConnection();
    const result = await db.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT TemplateId, Title, Description, Status, Steps, ImageUrl, Category, WorkflowData
        FROM Templates
        WHERE TemplateId = @id
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.json(result.recordset[0]);
  } catch (err: any) {
    console.error("🔥 Lỗi lấy template chi tiết:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.post("/", authenticateToken, async (req: any, res) => {
  try {
    const { title, description, status, steps, imageUrl, category, workflowData } = req.body;
    const db = await getDbConnection();
    const result = await db.request()
      .input("title", sql.NVarChar, title)
      .input("description", sql.NVarChar, description || null)
      .input("status", sql.NVarChar, status || 'Draft')
      .input("steps", sql.Int, steps || 0)
      .input("imageUrl", sql.NVarChar, imageUrl || null)
      .input("category", sql.NVarChar, category || null)
      .input("workflowData", sql.NVarChar, JSON.stringify(workflowData))
      .query(`
        INSERT INTO Templates (Title, Description, Status, Steps, ImageUrl, Category, WorkflowData)
        OUTPUT INSERTED.TemplateId
        VALUES (@title, @description, @status, @steps, @imageUrl, @category, @workflowData)
      `);
    res.json({ message: "Template created", id: result.recordset[0].TemplateId });
  } catch (err: any) {
    console.error("🔥 Lỗi tạo template:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.put("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, steps, imageUrl, category, workflowData } = req.body;
    const db = await getDbConnection();
    await db.request()
      .input("id", sql.Int, id)
      .input("title", sql.NVarChar, title)
      .input("description", sql.NVarChar, description)
      .input("status", sql.NVarChar, status)
      .input("steps", sql.Int, steps)
      .input("imageUrl", sql.NVarChar, imageUrl)
      .input("category", sql.NVarChar, category)
      .input("workflowData", sql.NVarChar, JSON.stringify(workflowData))
      .query(`
        UPDATE Templates
        SET Title = @title, Description = @description, Status = @status,
            Steps = @steps, ImageUrl = @imageUrl, Category = @category,
            WorkflowData = @workflowData, UpdatedAt = GETDATE()
        WHERE TemplateId = @id
      `);
    res.json({ message: "Template updated" });
  } catch (err: any) {
    console.error("🔥 Lỗi cập nhật template:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const db = await getDbConnection();
    await db.request()
      .input("id", sql.Int, id)
      .query(`DELETE FROM Templates WHERE TemplateId = @id`);
    res.json({ message: "Template deleted" });
  } catch (err: any) {
    console.error("🔥 Lỗi xóa template:", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;