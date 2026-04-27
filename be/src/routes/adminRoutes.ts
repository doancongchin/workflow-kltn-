import express from "express";
import bcrypt from "bcryptjs";
import { getDbConnection, sql } from "../lib/db.ts";
import { authenticateToken, checkAdmin } from "../middlewares/auth.ts";

const router = express.Router();

router.use(authenticateToken, checkAdmin);

router.get("/users", async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const db = await getDbConnection();
    const countResult = await db.request()
      .input("search", sql.NVarChar, `%${search}%`)
      .query(`
        SELECT COUNT(*) as total FROM Users 
        WHERE (FullName LIKE @search OR Email LIKE @search)
      `);
    const total = countResult.recordset[0].total;
    const users = await db.request()
      .input("search", sql.NVarChar, `%${search}%`)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query(`
        SELECT u.UserId, u.FullName, u.Email, u.Role, u.IsActive, u.CreatedAt,
               (SELECT COUNT(*) FROM Workflows WHERE UserId = u.UserId) as WorkflowCount
        FROM Users u
        WHERE (u.FullName LIKE @search OR u.Email LIKE @search)
        ORDER BY u.CreatedAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    res.json({ users: users.recordset, total, page, limit });
  } catch (err: any) {
    console.error("🔥 Lỗi lấy danh sách user:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.get("/workflows", async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const search = req.query.search || '';

    const db = await getDbConnection();

    const whereConditions = [];
    if (search) {
      whereConditions.push(`(w.WorkflowName LIKE @search OR u.FullName LIKE @search OR u.Email LIKE @search)`);
    }
    if (userId) {
      whereConditions.push(`w.UserId = @userId`);
    }
    const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) as total FROM Workflows w
      LEFT JOIN Users u ON w.UserId = u.UserId
      ${whereClause}
    `;

    const listQuery = `
      SELECT w.WorkflowId, w.WorkflowName, w.Description, w.CreatedAt, w.UpdatedAt,
             u.UserId, u.FullName, u.Email, u.Role,
             (SELECT COUNT(*) FROM WorkflowExecutions WHERE WorkflowId = w.WorkflowId) as ExecutionCount
      FROM Workflows w
      LEFT JOIN Users u ON w.UserId = u.UserId
      ${whereClause}
      ORDER BY w.CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const request = db.request()
      .input("search", sql.NVarChar, `%${search}%`)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit);
    if (userId) {
      request.input("userId", sql.Int, userId);
    }

    const countResult = await request.query(countQuery);
    const total = countResult.recordset[0].total;

    const workflows = await request.query(listQuery);

    res.json({ workflows: workflows.recordset, total, page, limit });
  } catch (err: any) {
    console.error("🔥 Lỗi lấy danh sách workflow:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.delete("/workflows/:id", async (req: any, res) => {
  try {
    const workflowId = req.params.id;
    const db = await getDbConnection();
    await db.request()
      .input("id", sql.Int, workflowId)
      .query("DELETE FROM Workflows WHERE WorkflowId = @id");
    res.json({ message: "Workflow deleted" });
  } catch (err: any) {
    console.error("🔥 Lỗi xóa workflow:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.post("/users", async (req: any, res) => {
  try {
    const { fullName, email, password, role, isActive } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }
    const db = await getDbConnection();
    const check = await db.request()
      .input("email", sql.NVarChar, email)
      .query("SELECT UserId FROM Users WHERE Email = @email");
    if (check.recordset.length > 0) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    await db.request()
      .input("fullName", sql.NVarChar, fullName)
      .input("email", sql.NVarChar, email)
      .input("passwordHash", sql.NVarChar, passwordHash)
      .input("role", sql.NVarChar, role || 'user')
      .input("isActive", sql.Bit, isActive !== undefined ? isActive : 1)
      .query(`
        INSERT INTO Users (FullName, Email, PasswordHash, Role, IsActive, CreatedAt)
        VALUES (@fullName, @email, @passwordHash, @role, @isActive, GETDATE())
      `);
    res.json({ message: "User created successfully" });
  } catch (err: any) {
    console.error("🔥 Lỗi tạo user:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.put("/users/:id", async (req: any, res) => {
  try {
    const userId = req.params.id;
    const { fullName, email, role, isActive } = req.body;

    const db = await getDbConnection();
    const check = await db.request()
      .input("id", sql.Int, userId)
      .query("SELECT UserId FROM Users WHERE UserId = @id");
    if (check.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await db.request()
      .input("id", sql.Int, userId)
      .input("fullName", sql.NVarChar, fullName)
      .input("email", sql.NVarChar, email)
      .input("role", sql.NVarChar, role)
      .input("isActive", sql.Bit, isActive)
      .query(`
        UPDATE Users 
        SET FullName = @fullName, Email = @email, Role = @role, IsActive = @isActive, UpdatedAt = GETDATE()
        WHERE UserId = @id
      `);

    res.json({ message: "User updated" });
  } catch (err: any) {
    console.error("🔥 Lỗi cập nhật user:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.delete("/users/:id", async (req: any, res) => {
  try {
    const userId = req.params.id;

    if (parseInt(userId) === req.user.userId) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }

    const db = await getDbConnection();
    await db.request()
      .input("id", sql.Int, userId)
      .query("DELETE FROM Users WHERE UserId = @id");

    res.json({ message: "User deleted (cascade workflows)" });
  } catch (err: any) {
    console.error("🔥 Lỗi xóa user:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.post("/users/:id/reset-password", async (req: any, res) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: "New password required" });
    }

    const db = await getDbConnection();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.request()
      .input("id", sql.Int, userId)
      .input("passwordHash", sql.NVarChar, passwordHash)
      .query(`
        UPDATE Users SET PasswordHash = @passwordHash, UpdatedAt = GETDATE()
        WHERE UserId = @id
      `);

    res.json({ message: "Password reset successfully" });
  } catch (err: any) {
    console.error("🔥 Lỗi reset password:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.get("/templates", async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const db = await getDbConnection();

    const countResult = await db.request()
      .query("SELECT COUNT(*) as total FROM Templates");
    const total = countResult.recordset[0].total;

    const templates = await db.request()
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query(`
        SELECT TemplateId, Title, Description, Status, Steps, ImageUrl, Category, CreatedAt
        FROM Templates
        ORDER BY CreatedAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    res.json({ templates: templates.recordset, total, page, limit });
  } catch (err: any) {
    console.error("🔥 Lỗi lấy templates:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.post("/templates", async (req: any, res) => {
  try {
    const { title, description, status, steps, imageUrl, category, workflowData } = req.body;
    if (!title || !workflowData) {
      return res.status(400).json({ message: "Title and workflowData are required" });
    }

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

    res.json({
      message: "Template created",
      id: result.recordset?.[0]?.TemplateId
    });
  } catch (err: any) {
    console.error("🔥 Lỗi tạo template:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.put("/templates/:id", async (req: any, res) => {
  try {
    const templateId = req.params.id;
    const { title, description, status, steps, imageUrl, category, workflowData } = req.body;

    const db = await getDbConnection();
    await db.request()
      .input("id", sql.Int, templateId)
      .input("title", sql.NVarChar, title)
      .input("description", sql.NVarChar, description)
      .input("status", sql.NVarChar, status)
      .input("steps", sql.Int, steps)
      .input("imageUrl", sql.NVarChar, imageUrl)
      .input("category", sql.NVarChar, category)
      .input("workflowData", sql.NVarChar, workflowData ? JSON.stringify(workflowData) : null)
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

router.delete("/templates/:id", async (req: any, res) => {
  try {
    const templateId = req.params.id;
    const db = await getDbConnection();
    await db.request()
      .input("id", sql.Int, templateId)
      .query("DELETE FROM Templates WHERE TemplateId = @id");

    res.json({ message: "Template deleted" });
  } catch (err: any) {
    console.error("🔥 Lỗi xóa template:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.get("/stats", async (req: any, res) => {
  try {
    const db = await getDbConnection();

    const userCount = await db.request().query("SELECT COUNT(*) as total FROM Users");
    const workflowCount = await db.request().query("SELECT COUNT(*) as total FROM Workflows");
    const executionCount = await db.request().query("SELECT COUNT(*) as total FROM WorkflowExecutions");
    const topUsers = await db.request().query(`
      SELECT TOP 5 u.UserId, u.FullName, u.Email, COUNT(w.WorkflowId) as WorkflowCount
      FROM Users u
      LEFT JOIN Workflows w ON u.UserId = w.UserId
      GROUP BY u.UserId, u.FullName, u.Email
      ORDER BY WorkflowCount DESC
    `);

    res.json({
      totalUsers: userCount.recordset[0].total,
      totalWorkflows: workflowCount.recordset[0].total,
      totalExecutions: executionCount.recordset[0].total,
      topUsers: topUsers.recordset
    });
  } catch (err: any) {
    console.error("🔥 Lỗi lấy thống kê:", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;