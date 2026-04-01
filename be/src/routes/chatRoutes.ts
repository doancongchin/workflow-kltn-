import express from "express";
import { getDbConnection, sql } from "../lib/db.ts";
import { authenticateToken } from "../middlewares/auth.ts";
import { generateText } from "../services/geminiService.ts";

const router = express.Router();
router.use(authenticateToken);

// GET /api/chat/sessions
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

// POST /api/chat/sessions
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

// PUT /api/chat/sessions/:sessionId
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

        // Lấy dữ liệu hiện tại để merge
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

// DELETE /api/chat/sessions/:sessionId
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

// GET /api/chat/sessions/:sessionId/messages
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

// POST /api/chat/sessions/:sessionId/messages
router.post("/sessions/:sessionId/messages", async (req: any, res) => {
    try {
        const userId = req.user.userId;
        const sessionId = req.params.sessionId;
        const { message } = req.body;
        if (!message) return res.status(400).json({ message: "Message required" });

        const db = await getDbConnection();

        // Lấy session info: SystemPrompt, Model, và thông tin người dùng
        const sessionCheck = await db.request()
            .input("sessionId", sql.UniqueIdentifier, sessionId)
            .input("userId", sql.Int, userId)
            .query(`SELECT SessionId, SystemPrompt, Model, UserFullName, UserBirthYear, UserJob 
                    FROM ChatSessions WHERE SessionId = @sessionId AND UserId = @userId`);
        if (sessionCheck.recordset.length === 0) return res.status(404).json({ message: "Session not found" });
        const { SystemPrompt: systemPrompt, Model: model, UserFullName, UserBirthYear, UserJob } = sessionCheck.recordset[0];

        // Đếm số tin nhắn user (giới hạn 100)
        const countResult = await db.request()
            .input("sessionId", sql.UniqueIdentifier, sessionId)
            .query(`SELECT COUNT(*) as count FROM ChatMessages WHERE SessionId = @sessionId AND Role = 'user'`);
        const userMsgCount = countResult.recordset[0].count;
        if (userMsgCount >= 100) {
            return res.status(400).json({ message: "Đã đạt giới hạn 100 câu hỏi. Vui lòng tạo cuộc trò chuyện mới." });
        }

        // Lưu tin nhắn user
        await db.request()
            .input("sessionId", sql.UniqueIdentifier, sessionId)
            .input("role", sql.NVarChar, "user")
            .input("content", sql.NVarChar, message)
            .query(`INSERT INTO ChatMessages (SessionId, Role, Content) VALUES (@sessionId, @role, @content)`);

        // Lấy lịch sử gần nhất (tối đa 10 tin nhắn)
        const history = await db.request()
            .input("sessionId", sql.UniqueIdentifier, sessionId)
            .query(`SELECT TOP 10 Role, Content FROM ChatMessages WHERE SessionId = @sessionId ORDER BY CreatedAt DESC`);
        const messages = history.recordset.reverse();

        // Xây dựng prompt
        let fullPrompt = "";
        // Thêm thông tin người dùng nếu có
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
            fullPrompt += `${msg.Role === "user" ? "User" : "Assistant"}: ${msg.Content}\n`;
        }

        // Gọi Gemini với model từ session
        const responseText = await generateText(fullPrompt, model || "gemini-2.5-flash", 0.2, 8192);

        // Lưu phản hồi assistant
        await db.request()
            .input("sessionId", sql.UniqueIdentifier, sessionId)
            .input("role", sql.NVarChar, "assistant")
            .input("content", sql.NVarChar, responseText)
            .query(`INSERT INTO ChatMessages (SessionId, Role, Content) VALUES (@sessionId, @role, @content)`);

        res.json({ response: responseText });
    } catch (err: any) {
        console.error("Lỗi xử lý tin nhắn chat:", err);
        res.status(500).json({ message: "server error" });
    }
});

export default router;