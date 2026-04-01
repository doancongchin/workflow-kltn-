import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import { getDbConnection, sql } from "../lib/db.ts";
import { JWT_SECRET } from "../middlewares/auth.ts";
import crypto from 'crypto';
import { sendResetPasswordEmail } from '../services/emailService.js';

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, birthDate, address, password } = req.body;
    const db = await getDbConnection();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    await db.request()
      .input("fullName", sql.NVarChar, fullName)
      .input("birthDate", sql.Date, birthDate || null)
      .input("address", sql.NVarChar, address || null)
      .input("email", sql.NVarChar, email)
      .input("passwordHash", sql.NVarChar, passwordHash)
      .query(`
        INSERT INTO Users (FullName, BirthDate, UserAddress, Email, PasswordHash)
        VALUES (@fullName, @birthDate, @address, @email, @passwordHash)
      `);
    res.json({ message: "register success" });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await getDbConnection();
    const result = await db.request()
      .input("email", sql.NVarChar, email)
      .query(`SELECT * FROM Users WHERE Email = @email`);
    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ message: "Email không tồn tại" });
    }
    if (!user.IsActive) {
      return res.status(401).json({ message: "Tài khoản đã bị khóa" });
    }
    const valid = await bcrypt.compare(password, user.PasswordHash);
    if (!valid) {
      return res.status(401).json({ message: "Mật khẩu không đúng" });
    }
    const token = jwt.sign(
      { userId: user.UserId, email: user.Email, role: user.Role || 'user' },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({
      token,
      user: { id: user.UserId, fullName: user.FullName, email: user.Email, role: user.Role || 'user' }
    });
  } catch (err) {
    res.status(500).json({ message: "server error" });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email là bắt buộc' });

    const db = await getDbConnection();
    const result = await db.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT UserId, Email FROM Users WHERE Email = @email');
    const user = result.recordset[0];
    if (!user) {
      return res.status(200).json({ message: 'Nếu email tồn tại, chúng tôi đã gửi link reset.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await db.request()
      .input('email', sql.NVarChar, email)
      .input('token', sql.NVarChar, token)
      .query(`
        UPDATE Users 
        SET ResetToken = @token, 
            ResetTokenExpires = DATEADD(HOUR, 1, GETUTCDATE())
        WHERE Email = @email
      `);

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendResetPasswordEmail(email, resetLink);

    res.json({ message: 'Nếu email tồn tại, chúng tôi đã gửi link reset.' });
  } catch (err) {
    console.error('Lỗi forgot-password:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Thiếu token hoặc mật khẩu mới' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const db = await getDbConnection();
    const result = await db.request()
      .input('token', sql.NVarChar, token)
      .query(`
        SELECT UserId FROM Users 
        WHERE ResetToken = @token AND ResetTokenExpires > GETUTCDATE()
      `);
    const user = result.recordset[0];
    if (!user) {
      return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.request()
      .input('userId', sql.Int, user.UserId)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .query(`
        UPDATE Users 
        SET PasswordHash = @passwordHash, ResetToken = NULL, ResetTokenExpires = NULL 
        WHERE UserId = @userId
      `);

    res.json({ message: 'Mật khẩu đã được đặt lại thành công.' });
  } catch (err) {
    console.error('Lỗi reset-password:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// OAuth callback endpoint - sửa để đóng popup và gửi message về parent
router.get("/callback", async (req, res) => {
  console.log("🔥 Callback reached with code and state");
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).send("Missing code or state");
    }

    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const { userId, toolId, toolName } = stateData; // lấy toolName từ state
    const db = await getDbConnection();

    // Lấy tool info
    const tool = await db.request()
      .input("toolId", sql.Int, toolId)
      .query(`SELECT * FROM Tools WHERE ToolId = @toolId`);
    if (tool.recordset.length === 0) {
      throw new Error("Tool not found");
    }
    const toolData = tool.recordset[0];

    // Lấy cấu hình (ưu tiên user config)
    const userConfig = await db.request()
      .input("userId", sql.Int, userId)
      .input("toolId", sql.Int, toolId)
      .query(`SELECT * FROM UserToolConfig WHERE UserId = @userId AND ToolId = @toolId`);

    let clientId, clientSecret, tokenUrl;
    if (userConfig.recordset.length > 0) {
      const uc = userConfig.recordset[0];
      clientId = uc.ClientId;
      clientSecret = uc.ClientSecret;
      tokenUrl = uc.TokenUrl;
    } else {
      const authConfig = JSON.parse(toolData.AuthConfig || "{}");
      clientId = authConfig.clientId;
      clientSecret = authConfig.clientSecret;
      tokenUrl = authConfig.tokenUrl;
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/callback`;

    // Trao đổi code lấy token
    const tokenResponse = await axios.post(tokenUrl, {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }, { headers: { 'Content-Type': 'application/json' } });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Lưu token vào UserToolAuth
    await db.request()
      .input("userId", sql.Int, userId)
      .input("toolId", sql.Int, toolId)
      .input("accessToken", sql.NVarChar, access_token)
      .input("refreshToken", sql.NVarChar, refresh_token || null)
      .input("expiresAt", sql.DateTime, expiresAt)
      .query(`
        MERGE UserToolAuth AS target
        USING (SELECT @userId AS UserId, @toolId AS ToolId) AS source
        ON target.UserId = source.UserId AND target.ToolId = source.ToolId
        WHEN MATCHED THEN
          UPDATE SET AccessToken = @accessToken, RefreshToken = @refreshToken, ExpiresAt = @expiresAt, UpdatedAt = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (UserId, ToolId, AccessToken, RefreshToken, ExpiresAt) VALUES (@userId, @toolId, @accessToken, @refreshToken, @expiresAt);
      `);

    // Thành công: gửi HTML với postMessage và đóng popup
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.send(`
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'oauth', success: true, toolName: '${toolName}' }, '${frontendUrl}');
            }
            window.close();
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("🔥 Lỗi OAuth callback:", err);
    // Lỗi: gửi message thất bại về parent
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    // Lấy toolName từ state nếu có (đã parse ở trên), nhưng nếu lỗi xảy ra trước khi parse state thì dùng fallback
    let toolName = 'unknown';
    try {
      const state = req.query.state as string;
      if (state) {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        toolName = stateData.toolName || 'unknown';
      }
    } catch (e) {}
    res.send(`
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'oauth', success: false, toolName: '${toolName}', error: '${err.message.replace(/'/g, "\\'")}' }, '${frontendUrl}');
            }
            window.close();
          </script>
        </body>
      </html>
    `);
  }
});

// Endpoint tạo OAuth URL cho tool
router.get("/:toolName", async (req: any, res) => {
  try {
    const token = req.query.token as string;
    if (!token) return res.status(401).json({ message: "No token" });
    jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
      if (err) return res.status(403).json({ message: "Invalid token" });
      const toolName = req.params.toolName;
      const userId = user.userId;
      const db = await getDbConnection();

      const tool = await db.request()
        .input("toolName", sql.NVarChar, toolName)
        .query(`SELECT * FROM Tools WHERE ToolName = @toolName AND IsActive = 1`);
      if (tool.recordset.length === 0) return res.status(404).json({ message: "Tool not found" });
      const toolData = tool.recordset[0];

      const userConfig = await db.request()
        .input("userId", sql.Int, userId)
        .input("toolId", sql.Int, toolData.ToolId)
        .query(`SELECT * FROM UserToolConfig WHERE UserId = @userId AND ToolId = @toolId`);

      let clientId, clientSecret, authUrl, tokenUrl, scope;
      if (userConfig.recordset.length > 0) {
        const uc = userConfig.recordset[0];
        clientId = uc.ClientId;
        clientSecret = uc.ClientSecret;
        authUrl = uc.AuthUrl;
        tokenUrl = uc.TokenUrl;
        scope = uc.Scope;
      } else {
        const authConfig = JSON.parse(toolData.AuthConfig || "{}");
        clientId = authConfig.clientId;
        clientSecret = authConfig.clientSecret;
        authUrl = authConfig.authUrl;
        tokenUrl = authConfig.tokenUrl;
        scope = authConfig.scope;
      }

      if (!clientId || !clientSecret) {
        return res.status(400).json({ message: "Missing client credentials. Please configure the tool first." });
      }

      // Tạo state có chứa userId, toolId và toolName
      const state = Buffer.from(JSON.stringify({ userId, toolId: toolData.ToolId, toolName })).toString('base64');
      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/callback`;
      const authUrlObj = new URL(authUrl);
      authUrlObj.searchParams.append('client_id', clientId);
      authUrlObj.searchParams.append('redirect_uri', redirectUri);
      authUrlObj.searchParams.append('response_type', 'code');
      authUrlObj.searchParams.append('scope', scope);
      authUrlObj.searchParams.append('state', state);
      authUrlObj.searchParams.append('access_type', 'offline');
      authUrlObj.searchParams.append('prompt', 'consent');
      res.redirect(authUrlObj.toString());
    });
  } catch (err: any) {
    console.error("🔥 Lỗi OAuth redirect:", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;