import express from "express";
import bcrypt from "bcryptjs";
import { getDbConnection, sql } from "../lib/db.ts";
import { authenticateToken } from "../middlewares/auth.ts";
import { upload } from "../middlewares/upload.ts";

const router = express.Router();

router.get("/profile", authenticateToken, async (req: any, res) => {
  try {
    const db = await getDbConnection();
    const result = await db.request()
      .input("userId", sql.Int, req.user.userId)
      .query(`
        SELECT UserId, FullName, Email, BirthDate, UserAddress, AvatarUrl, CreatedAt
        FROM Users WHERE UserId = @userId
      `);
    if (result.recordset.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(result.recordset[0]);
  } catch (err: any) {
    console.error("🔥 Lỗi lấy profile:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.put("/update", authenticateToken, async (req: any, res) => {
  try {
    const { fullName, email, birthDate, address, password } = req.body;
    const userId = req.user.userId;
    const db = await getDbConnection();
    if (email) {
      const checkEmail = await db.request()
        .input("email", sql.NVarChar, email)
        .input("userId", sql.Int, userId)
        .query(`SELECT UserId FROM Users WHERE Email = @email AND UserId != @userId`);
      if (checkEmail.recordset.length > 0) return res.status(400).json({ message: "Email already exists" });
    }
    let query = `UPDATE Users SET FullName = @fullName, Email = @email, BirthDate = @birthDate, UserAddress = @address`;
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      query += `, PasswordHash = @passwordHash`;
    }
    query += `, UpdatedAt = GETDATE() WHERE UserId = @userId`;
    const request = db.request()
      .input("fullName", sql.NVarChar, fullName)
      .input("email", sql.NVarChar, email)
      .input("birthDate", sql.Date, birthDate || null)
      .input("address", sql.NVarChar, address || null)
      .input("userId", sql.Int, userId);
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      request.input("passwordHash", sql.NVarChar, passwordHash);
    }
    await request.query(query);
    res.json({ message: "update success" });
  } catch (err: any) {
    console.error("🔥 Lỗi cập nhật user:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.post("/upload-avatar", authenticateToken, upload.single("avatar"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const avatarUrl = `/uploads/${req.file.filename}`;
    const userId = req.user.userId;
    const db = await getDbConnection();
    await db.request()
      .input("avatarUrl", sql.NVarChar, avatarUrl)
      .input("userId", sql.Int, userId)
      .query(`UPDATE Users SET AvatarUrl = @avatarUrl WHERE UserId = @userId`);
    res.json({ message: "Avatar updated", avatarUrl });
  } catch (err: any) {
    console.error("🔥 Lỗi upload avatar:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.get("/workflows", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const db = await getDbConnection();
    const result = await db.request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT 
          w.WorkflowId, 
          w.WorkflowName, 
          COUNT(e.ExecutionId) AS totalRuns, 
          MAX(e.StartedAt) AS lastRunAt,
          CASE WHEN ws.WorkflowId IS NOT NULL THEN 1 ELSE 0 END AS hasSchedule
        FROM Workflows w
        LEFT JOIN WorkflowExecutions e ON w.WorkflowId = e.WorkflowId
        LEFT JOIN WorkflowSchedules ws ON w.WorkflowId = ws.WorkflowId
        WHERE w.UserId = @userId
        GROUP BY w.WorkflowId, w.WorkflowName, ws.WorkflowId
        ORDER BY lastRunAt DESC
      `);
    res.json(result.recordset);
  } catch (err: any) {
    console.error("🔥 Lỗi lấy workflows:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.get("/activities", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const db = await getDbConnection();
    const result = await db.request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT e.ExecutionId, w.WorkflowName, e.Status, e.StartedAt, e.FinishedAt
        FROM WorkflowExecutions e
        JOIN Workflows w ON e.WorkflowId = w.WorkflowId
        WHERE w.UserId = @userId
        ORDER BY e.StartedAt DESC
        OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
      `);
    res.json(result.recordset);
  } catch (err: any) {
    console.error("🔥 Lỗi lấy activities:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.get("/tools", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const db = await getDbConnection();
    const result = await db.request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT t.ToolId, t.ToolName, t.DisplayName, t.Description, t.AuthType,
               CASE WHEN uta.UserId IS NOT NULL THEN 1 ELSE 0 END AS IsConnected
        FROM Tools t
        LEFT JOIN UserToolAuth uta ON t.ToolId = uta.ToolId AND uta.UserId = @userId
        WHERE t.IsActive = 1
      `);
    res.json(result.recordset);
  } catch (err: any) {
    console.error("🔥 Lỗi lấy user tools:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.get("/tool-config/:toolId", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const toolId = req.params.toolId;
    const db = await getDbConnection();
    const result = await db.request()
      .input("userId", sql.Int, userId)
      .input("toolId", sql.Int, toolId)
      .query(`
        SELECT ClientId, AuthUrl, TokenUrl, Scope
        FROM UserToolConfig
        WHERE UserId = @userId AND ToolId = @toolId
      `);
    res.json(result.recordset[0] || null);
  } catch (err: any) {
    console.error("🔥 Lỗi lấy tool config:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.post("/tool-config", authenticateToken, async (req: any, res) => {
  try {
    const { toolId, clientId, clientSecret, authUrl, tokenUrl, scope } = req.body;
    const userId = req.user.userId;
    const db = await getDbConnection();
    const toolCheck = await db.request()
      .input("toolId", sql.Int, toolId)
      .query(`SELECT ToolId FROM Tools WHERE ToolId = @toolId`);
    if (toolCheck.recordset.length === 0) return res.status(404).json({ message: "Tool not found" });
    const existing = await db.request()
      .input("userId", sql.Int, userId)
      .input("toolId", sql.Int, toolId)
      .query(`SELECT * FROM UserToolConfig WHERE UserId = @userId AND ToolId = @toolId`);
    if (existing.recordset.length > 0) {
      let query = `UPDATE UserToolConfig SET ClientId = @clientId, AuthUrl = @authUrl, TokenUrl = @tokenUrl, Scope = @scope, UpdatedAt = GETDATE()`;
      if (clientSecret && clientSecret.trim() !== '') query += `, ClientSecret = @clientSecret`;
      query += ` WHERE UserId = @userId AND ToolId = @toolId`;
      const request = db.request()
        .input("userId", sql.Int, userId)
        .input("toolId", sql.Int, toolId)
        .input("clientId", sql.NVarChar, clientId)
        .input("authUrl", sql.NVarChar, authUrl)
        .input("tokenUrl", sql.NVarChar, tokenUrl)
        .input("scope", sql.NVarChar, scope);
      if (clientSecret && clientSecret.trim() !== '') request.input("clientSecret", sql.NVarChar, clientSecret);
      await request.query(query);
    } else {
      if (!clientSecret || clientSecret.trim() === '') return res.status(400).json({ message: "Client Secret is required for new configuration" });
      await db.request()
        .input("userId", sql.Int, userId)
        .input("toolId", sql.Int, toolId)
        .input("clientId", sql.NVarChar, clientId)
        .input("clientSecret", sql.NVarChar, clientSecret)
        .input("authUrl", sql.NVarChar, authUrl)
        .input("tokenUrl", sql.NVarChar, tokenUrl)
        .input("scope", sql.NVarChar, scope)
        .query(`
          INSERT INTO UserToolConfig (UserId, ToolId, ClientId, ClientSecret, AuthUrl, TokenUrl, Scope)
          VALUES (@userId, @toolId, @clientId, @clientSecret, @authUrl, @tokenUrl, @scope)
        `);
    }
    res.json({ message: "Configuration saved" });
  } catch (err: any) {
    console.error("🔥 Lỗi lưu tool config:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.delete("/tool/:toolId", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const toolId = req.params.toolId;
    const db = await getDbConnection();
    await db.request()
      .input("userId", sql.Int, userId)
      .input("toolId", sql.Int, toolId)
      .query(`DELETE FROM UserToolAuth WHERE UserId = @userId AND ToolId = @toolId`);
    res.json({ message: "Disconnected" });
  } catch (err: any) {
    console.error("🔥 Lỗi ngắt kết nối:", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;