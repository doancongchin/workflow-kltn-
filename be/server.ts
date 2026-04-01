process.env.TZ = 'Asia/Ho_Chi_Minh';
import "dotenv/config"; // 🔥 BẮT BUỘC NẰM Ở DÒNG ĐẦU TIÊN ĐỂ NẠP .ENV TRƯỚC MỌI THỨ
import express from "express";
import cors from "cors";
import path from "path";

// Import routes (lúc này các file bên trong import db.ts thì biến env đã có sẵn)
import authRoutes from "./src/routes/authRoutes.ts";
import workflowRoutes from "./src/routes/workflowRoutes.ts";
import userRoutes from "./src/routes/userRoutes.ts";
import toolRoutes from "./src/routes/toolRoutes.ts";
import templateRoutes from "./src/routes/templateRoutes.ts";
import fileParserRoutes  from "./src/routes/fileParserRoutes.ts";
import { initScheduledJobs } from './src/services/schedulerService.ts';
import adminRoutes from "./src/routes/adminRoutes.ts";
import chatRoutes from "./src/routes/chatRoutes.ts";
import adminChatRoutes from "./src/routes/adminChatRoutes.ts";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

// Phục vụ file tĩnh
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Đăng ký routes
app.use("/api/auth", authRoutes);
app.use("/api/workflow", workflowRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api", fileParserRoutes );
app.use("/api/chat", chatRoutes);
app.use("/api/admin/chat", adminChatRoutes);
app.listen(PORT, () => {
  console.log(`🚀 Server running http://localhost:${PORT}`);
  initScheduledJobs().catch(console.error);
});