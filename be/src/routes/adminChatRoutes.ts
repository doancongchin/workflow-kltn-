import express from "express";
import { getDbConnection, sql } from "../lib/db.ts";
import { authenticateToken, checkAdmin } from "../middlewares/auth.ts";

const router = express.Router();

router.use(authenticateToken, checkAdmin);

router.get("/users", async (req: any, res) => {
  try {
    const db = await getDbConnection();
    const result = await db.request().query(`
      SELECT u.UserId, u.FullName, u.Email, COUNT(s.SessionId) as SessionCount, MAX(s.UpdatedAt) as LastActivity
      FROM Users u
      INNER JOIN ChatSessions s ON u.UserId = s.UserId
      GROUP BY u.UserId, u.FullName, u.Email
      ORDER BY LastActivity DESC
    `);
    res.json(result.recordset);
  } catch (err: any) {
    console.error("Lỗi lấy danh sách user chat:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.get("/sessions/:userId", async (req: any, res) => {
  try {
    const userId = req.params.userId;
    const db = await getDbConnection();
    const result = await db.request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT SessionId, Title, Description, Model, CreatedAt, UpdatedAt
        FROM ChatSessions
        WHERE UserId = @userId
        ORDER BY UpdatedAt DESC
      `);
    res.json(result.recordset);
  } catch (err: any) {
    console.error("Lỗi lấy danh sách session:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.delete("/sessions/:sessionId", async (req: any, res) => {
  try {
    const sessionId = req.params.sessionId;
    const db = await getDbConnection();
    const result = await db.request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .query(`DELETE FROM ChatSessions WHERE SessionId = @sessionId`);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Không tìm thấy session để xóa" });
    }

    res.json({ message: "Session deleted successfully" });
  } catch (err: any) {
    console.error("Lỗi xóa session:", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;