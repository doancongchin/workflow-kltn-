import express from "express";
import { getDbConnection, sql } from "../lib/db.ts";
import { authenticateToken } from "../middlewares/auth.ts";
import { generateText } from "../services/geminiService.ts";

const router = express.Router();
router.use(authenticateToken);

router.get("/sessions", async (req: any, res) => {
    try {
        const userId = req.user.userId;
        const db = await getDbConnection();
        const result = await db.request()
            .input("userId", sql.Int, userId)
            .query(`SELECT SessionId, Title, Description, SystemPrompt, Model, 
        UserFullName, UserBirthYear, UserJob, CreatedAt, UpdatedAt 
        FROM ChatSessions WHERE UserId = @userId ORDER BY UpdatedAt DESC`);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "server error" });
    }
});

router.post("/sessions", async (req: any, res) => {
    try {
        const userId = req.user.userId;
        const { title, description, systemPrompt, model, userFullName, userBirthYear, userJob } = req.body;
        if (!title) return res.status(400).json({ message: "Title required" });

        const db = await getDbConnection();
        const result = await db.request()
            .input("userId", sql.Int, userId)
            .input("title", sql.NVarChar, title)
            .input("description", sql.NVarChar, description || null)
            .input("systemPrompt", sql.NVarChar, systemPrompt || null)
            .input("model", sql.NVarChar, model || 'gemini-2.5-flash')
            .input("userFullName", sql.NVarChar, userFullName || null)
            .input("userBirthYear", sql.Int, userBirthYear || null)
            .input("userJob", sql.NVarChar, userJob || null)
            .query(`INSERT INTO ChatSessions (UserId, Title, Description, SystemPrompt, Model, UserFullName, UserBirthYear, UserJob)
                    OUTPUT INSERTED.SessionId 
                    VALUES (@userId, @title, @description, @systemPrompt, @model, @userFullName, @userBirthYear, @userJob)`);
        const sessionId = result.recordset[0].SessionId;
        res.json({ sessionId, message: "Session created" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "server error" });
    }
});

router.put("/sessions/:sessionId", async (req: any, res) => {
    try {
        const userId = req.user.userId;
        const sessionId = req.params.sessionId;
        const { title, description, systemPrompt, model, userFullName, userBirthYear, userJob } = req.body;

        const db = await getDbConnection();
        const check = await db.request()
            .input("sessionId", sql.UniqueIdentifier, sessionId)
            .input("userId", sql.Int, userId)
            .query(`SELECT SessionId FROM ChatSessions WHERE SessionId = @sessionId AND UserId = @userId`);
        if (check.recordset.length === 0) return res.status(404).json({ message: "Session not found" });

        const current = await db.request()
            .input("sessionId", sql.UniqueIdentifier, sessionId)
            .query(`SELECT Title, Description, SystemPrompt, Model, UserFullName, UserBirthYear, UserJob 
                    FROM ChatSessions WHERE SessionId = @sessionId`);
        const cur = current.recordset[0];

        const finalTitle = title !== undefined ? title : cur.Title;
        const finalDesc = description !== undefined ? description : cur.Description;
        const finalSys = systemPrompt !== undefined ? systemPrompt : cur.SystemPrompt;
        const finalModel = model !== undefined ? model : cur.Model;
        const finalFullName = userFullName !== undefined ? userFullName : cur.UserFullName;
        const finalBirthYear = userBirthYear !== undefined ? userBirthYear : cur.UserBirthYear;
        const finalJob = userJob !== undefined ? userJob : cur.UserJob;

        await db.request()
            .input("sessionId", sql.UniqueIdentifier, sessionId)
            .input("title", sql.NVarChar, finalTitle)
            .input("description", sql.NVarChar, finalDesc)
            .input("systemPrompt", sql.NVarChar, finalSys)
            .input("model", sql.NVarChar, finalModel)
            .input("userFullName", sql.NVarChar, finalFullName)
            .input("userBirthYear", sql.Int, finalBirthYear)
            .input("userJob", sql.NVarChar, finalJob)
            .query(`UPDATE ChatSessions 
                    SET Title = @title, 
                        Description = @description, 
                        SystemPrompt = @systemPrompt, 
                        Model = @model,
                        UserFullName = @userFullName,
                        UserBirthYear = @userBirthYear,
                        UserJob = @userJob,
                        UpdatedAt = GETUTCDATE() 
                    WHERE SessionId = @sessionId`);
        res.json({ message: "Session updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "server error" });
    }
});

router.delete("/sessions/:sessionId", async (req: any, res) => {
    try {
        const userId = req.user.userId;
        const sessionId = req.params.sessionId;

        const db = await getDbConnection();
        const check = await db.request()
            .input("sessionId", sql.UniqueIdentifier, sessionId)
            .input("userId", sql.Int, userId)
            .query(`SELECT SessionId FROM ChatSessions WHERE SessionId = @sessionId AND UserId = @userId`);
        if (check.recordset.length === 0) return res.status(404).json({ message: "Session not found" });

        await db.request()
            .input("sessionId", sql.UniqueIdentifier, sessionId)
            .query(`DELETE FROM ChatMessages WHERE SessionId = @sessionId`);
        await db.request()
            .input("sessionId", sql.UniqueIdentifier, sessionId)
            .query(`DELETE FROM ChatSessions WHERE SessionId = @sessionId`);
        res.json({ message: "Session deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "server error" });
    }
});

router.get("/sessions/:sessionId/messages", async (req: any, res) => {
    try {
        const userId = req.user.userId;
        const sessionId = req.params.sessionId;

        const db = await getDbConnection();
        const check = await db.request()
            .input("sessionId", sql.UniqueIdentifier, sessionId)
            .input("userId", sql.Int, userId)
            .query(`SELECT SessionId FROM ChatSessions WHERE SessionId = @sessionId AND UserId = @userId`);
        if (check.recordset.length === 0) return res.status(404).json({ message: "Session not found" });

        const result = await db.request()
            .input("sessionId", sql.UniqueIdentifier, sessionId)
            .query(`SELECT Id, Role, Content, CreatedAt FROM ChatMessages WHERE SessionId = @sessionId ORDER BY CreatedAt ASC`);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "server error" });
    }
});

router.post("/sessions/:sessionId/messages", async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const sessionId = req.params.sessionId;
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "Message required" });

    const db = await getDbConnection();

    const sessionCheck = await db.request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("userId", sql.Int, userId)
      .query(`SELECT SessionId, SystemPrompt, Model, UserFullName, UserBirthYear, UserJob 
              FROM ChatSessions WHERE SessionId = @sessionId AND UserId = @userId`);
    if (sessionCheck.recordset.length === 0) return res.status(404).json({ message: "Session not found" });
    const { SystemPrompt: systemPrompt, Model: model, UserFullName, UserBirthYear, UserJob } = sessionCheck.recordset[0];

    // Giới hạn số lượng tin nhắn user
    const countResult = await db.request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .query(`SELECT COUNT(*) as count FROM ChatMessages WHERE SessionId = @sessionId AND Role = 'user'`);
    if (countResult.recordset[0].count >= 100) {
      return res.status(400).json({ message: "Đã đạt giới hạn 100 câu hỏi. Vui lòng tạo cuộc trò chuyện mới." });
    }

    // Lưu tin nhắn user
    await db.request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("role", sql.NVarChar, "user")
      .input("content", sql.NVarChar, message)
      .query(`INSERT INTO ChatMessages (SessionId, Role, Content) VALUES (@sessionId, @role, @content)`);

    // Lấy tối đa 6 tin nhắn gần nhất (thay vì 10)
    const history = await db.request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .query(`SELECT TOP 6 Role, Content FROM ChatMessages WHERE SessionId = @sessionId ORDER BY CreatedAt DESC`);
    const messages = history.recordset.reverse();

    // Hàm cắt ngắn và làm sạch
    const clean = (text: string, maxLen: number = 300) => {
      let cleaned = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      if (cleaned.length > maxLen) cleaned = cleaned.substring(0, maxLen) + '…';
      return cleaned;
    };

    let fullPrompt = "";
    if (UserFullName) {
      fullPrompt += `Thông tin người dùng: Tên: ${UserFullName}`;
      if (UserBirthYear) fullPrompt += `, Năm sinh: ${UserBirthYear}`;
      if (UserJob) fullPrompt += `, Nghề nghiệp: ${UserJob}`;
      fullPrompt += "\n\n";
    }
    if (systemPrompt) {
      fullPrompt += `System: ${systemPrompt}\n\n`;
    }
    for (const msg of messages) {
      const role = msg.Role === "user" ? "User" : "Assistant";
      fullPrompt += `${role}: ${clean(msg.Content)}\n`;
    }
    // Giới hạn tổng độ dài prompt
    if (fullPrompt.length > 3500) fullPrompt = fullPrompt.substring(0, 3500) + "\n...[prompt bị cắt]";

    const responseText = await generateText(
      fullPrompt,
      model || "gemini-2.5-flash-lite",
      0.2,
      1024  // giảm mạnh output token
    );

    await db.request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("role", sql.NVarChar, "assistant")
      .input("content", sql.NVarChar, responseText)
      .query(`INSERT INTO ChatMessages (SessionId, Role, Content) VALUES (@sessionId, @role, @content)`);

    res.json({ response: responseText });
  } catch (err: any) {
    // Log chi tiết lỗi 400
    if (err.response?.status === 400) {
      console.error("Gemini 400 error details:", JSON.stringify(err.response.data, null, 2));
    }
    console.error("Lỗi xử lý tin nhắn chat:", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;