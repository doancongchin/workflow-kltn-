import axios from 'axios';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from "module";
import json5 from 'json5';
import * as XLSX from 'xlsx';
import { generateText } from './geminiService.ts';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

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

export async function parseFile(
  config: any,
  inputData: any,
  transaction: any,
  userId: number,
  nodeOutputs: any
) {
  const files = inputData?.files || (inputData?.fileBase64 ? [inputData] : []);

  if (files.length === 0 && config.storedFilePaths?.length) {
    const fileResults = [];
    for (const storedPath of config.storedFilePaths) {
      const filePath = path.join(process.cwd(), storedPath);
      const fileBuffer = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      const ext = path.extname(fileName).toLowerCase();
      const text = await extractTextFromBuffer(fileBuffer, ext);
      fileResults.push({ fileName, text, buffer: fileBuffer });
    }
    return await processFiles(fileResults, config);
  } else if (files.length > 0) {
    const fileResults = [];
    for (const file of files) {
      const buffer = Buffer.from(file.fileBase64, 'base64');
      const fileName = file.fileName || 'temp.pdf';
      const ext = path.extname(fileName).toLowerCase();
      const text = await extractTextFromBuffer(buffer, ext);
      fileResults.push({ fileName, text, buffer });
    }
    return await processFiles(fileResults, config);
  } else {
    throw new Error('No file data provided');
  }
}

async function processFiles(files: { fileName: string; text: string; buffer: Buffer }[], config: any) {
  // Prompt mặc định không yêu cầu JSON
  const prompt = config.systemPrompt || 'Đọc nội dung file và trả về thông tin cần thiết.';

  const results = [];
  for (const file of files) {
    const fullPrompt = `${prompt}\n\nNội dung file:\n${file.text}`;
    const responseText = await generateText(
      fullPrompt,
      config.model || 'gemini-2.5-flash',
      config.temperature || 0.2,
      8192
    );

    results.push({
      fileName: file.fileName,
      text: responseText,          // Kết quả AI (text)
      rawText: file.text           // Nội dung gốc file
    });
  }

  if (files.length === 1) {
    return {
      file: results[0].text,       // Để tương thích với cách dùng cũ
      fileName: results[0].fileName,
      text: results[0].rawText
    };
  }
  return { files: results, fileNames: files.map(f => f.fileName) };
}