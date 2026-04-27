import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import mammoth from "mammoth";
import { authenticateToken } from "../middlewares/auth.ts";
import { createRequire } from "module";
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { generateText } from "../services/geminiService.ts";

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const router = express.Router();
const upload = multer({ dest: 'uploads/temp/' });

const nodeFilesDir = path.join(process.cwd(), 'uploads', 'node-files');
if (!fs.existsSync(nodeFilesDir)) {
  fs.mkdirSync(nodeFilesDir, { recursive: true });
}

router.post('/upload-node-files', authenticateToken, upload.array('files', 10), async (req: any, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const filePaths: string[] = [];
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${uuidv4()}${ext}`;
      const destPath = path.join(nodeFilesDir, filename);
      fs.renameSync(file.path, destPath);
      filePaths.push(`/uploads/node-files/${filename}`);
    }
    res.json({ filePaths });
  } catch (err: any) {
    console.error('🔥 Lỗi upload files:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload-node-file', authenticateToken, upload.single('file'), async (req: any, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    const destPath = path.join(nodeFilesDir, filename);
    fs.renameSync(file.path, destPath);
    const fileUrl = `/uploads/node-files/${filename}`;
    res.json({ filePath: fileUrl });
  } catch (err: any) {
    console.error('🔥 Lỗi upload file node:', err);
    res.status(500).json({ error: err.message });
  }
});

async function extractTextFromBuffer(buffer: Buffer, ext: string): Promise<string> {
  if (ext === '.pdf') {
    const pdfData = await pdfParse(buffer);
    return pdfData.text;
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (ext === '.csv' || ext === '.txt') {
    return buffer.toString('utf8');
  } else if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellText: false, cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const nonEmptyRows = rows.filter(row => row && row.some((cell: any) => cell !== undefined && cell !== ''));
    const csvRows = nonEmptyRows.map(row =>
      row.map((cell: any) => {
        if (cell === undefined || cell === '') return '';
        if (typeof cell === 'number') return cell;
        if (cell instanceof Date) return cell.toISOString().split('T')[0];
        return String(cell);
      }).join(',')
    );
    return csvRows.join('\n');
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}

router.post('/parser', authenticateToken, upload.array('files', 10), async (req: any, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const prompt = req.body.prompt || 'Đọc nội dung file và trả về thông tin cần thiết.';
    const model = req.body.model || 'gemini-2.5-flash';

    const results: any[] = [];

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const dataBuffer = fs.readFileSync(file.path);
      let text = '';

      try {
        text = await extractTextFromBuffer(dataBuffer, ext);
      } catch (err: any) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: err.message });
      }

      fs.unlinkSync(file.path);

      const fullPrompt = `${prompt}\n\nNội dung file:\n${text}`;

      const responseText = await generateText(fullPrompt, model, 0.2, 8192);
      console.log('📝 Raw AI response:', responseText);

      results.push({ fileName: file.originalname, text: responseText });
    }

    res.json({ files: results });
  } catch (err: any) {
    console.error('🔥 Lỗi parse file:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;