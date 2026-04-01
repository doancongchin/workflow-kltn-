import axios from "axios";
import { sql } from "../lib/db.ts";
import json5 from 'json5';
import { generateText } from "./geminiService.ts";

function getToolListDescription(selectedTools: number[]): string {
  const tools = [];
  if (selectedTools.includes(1)) {
    tools.push('Gmail:\n- Gửi email: {"action": "send_email", "to": "email_nguoi_nhan", "subject": "tiêu đề", "body": "nội dung"}\n- Tìm email: {"action": "search_emails", "query": "từ khóa"}');
  }
  if (selectedTools.includes(2)) {
    tools.push(`Google Sheets:
- Đọc: {"action": "read_sheet", "spreadsheetId": "id_file", "range": "Sheet1"}
- Ghi: {"action": "write_sheet", "spreadsheetId": "id_file", "values": [["dữ liệu"]], "range": "A1"}
- Tạo mới: {"action": "create_sheet", "title": "tên bảng tính"}
- Tạo mới và ghi dữ liệu: {"actions": [{"action": "create_sheet", "title": "..."}, {"action": "write_sheet", "values": [...], "range": "..."}]}
`);
  }
  return tools.join('\n');
}

function extractJson(text: string): any {
  try {
    return json5.parse(text);
  } catch (e) {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        return json5.parse(codeBlockMatch[1]);
      } catch (e2) { /* fallback */ }
    }
    const start = text.indexOf('{');
    if (start === -1) return null;
    let depth = 0;
    let end = -1;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
    if (end === -1) return null;
    let jsonStr = text.substring(start, end);
    try {
      return json5.parse(jsonStr);
    } catch (e3) {
      return null;
    }
  }
}

function replaceVariables(text: string, nodeOutputs: Record<string, any>, context: Record<string, any> = {}): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match: string, path: string) => {
    const parts = path.trim().split('.');
    const nodeId = parts[0];
    const field = parts[1];

    if (context[path] !== undefined) return String(context[path]);

    if (nodeId === 'file' && !field) {
      const parserEntry = Object.entries(nodeOutputs).find(([id, out]) => 
        out && typeof out === 'object' && 'file' in out
      );
      if (parserEntry) {
        const value = parserEntry[1].file;
        return value !== undefined ? JSON.stringify(value) : match;
      }
    }

    const nodeOutput = nodeOutputs[nodeId];
    if (nodeOutput === undefined) {
      console.warn(`⚠️ Node output not found for id: ${nodeId}`);
      return match;
    }
    if (field) {
      const value = nodeOutput[field];
      if (value === undefined) {
        console.warn(`⚠️ Field '${field}' not found in node ${nodeId}`);
        return match;
      }
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    return typeof nodeOutput === 'object' ? JSON.stringify(nodeOutput) : String(nodeOutput);
  });
}

function isValidCommand(cmdObj: any): boolean {
  if (!cmdObj) return false;
  if (Array.isArray(cmdObj)) return cmdObj.length > 0;
  if (cmdObj.actions && Array.isArray(cmdObj.actions)) return true;
  if (cmdObj.action) return true;
  if (cmdObj.tool_code) return true;
  if (cmdObj.command && cmdObj.parameters) return true;
  if (cmdObj.tool && (cmdObj.function || cmdObj.parameters)) return true;
  if (cmdObj.spreadsheetId || cmdObj.to || cmdObj.sheet_url || cmdObj.query) return true;
  return false;
}

export async function processAIAgent(
  node: any,
  inputData: any,
  transaction: sql.Transaction,
  userId: number,
  nodeOutputs: Record<string, any>
) {
  const config = node.DataConfig ? JSON.parse(node.DataConfig) : {};
  let systemPrompt = config.systemPrompt || '';
  const selectedTools = config.selectedTools || [];

  console.log("📦 nodeOutputs trong AI Agent (keys):", Object.keys(nodeOutputs));
  Object.entries(nodeOutputs).forEach(([id, out]) => {
    console.log(`  - Node ${id}:`, Object.keys(out));
  });

  systemPrompt = replaceVariables(systemPrompt, nodeOutputs);
  console.log("📦 systemPrompt sau khi thay thế:", systemPrompt);

  let fullPrompt = systemPrompt;
  if (inputData) {
    if (typeof inputData === 'string') {
      fullPrompt += `\n\n${inputData}`;
    } else if (typeof inputData === 'object') {
      fullPrompt += `\n\nDữ liệu đầu vào: ${JSON.stringify(inputData)}`;
    }
  }

  let responseText = await generateText(
    fullPrompt,
    config.model || 'gemini-2.5-flash',
    config.temperature || 0.1,
    8192
  );
  console.log("🤖 AI response (lần 1):", responseText);

  if (selectedTools.length === 0) {
    return { text: responseText };
  }

  let cmd = extractJson(responseText);
  if (cmd && !isValidCommand(cmd)) {
    console.log("⚠️ Phát hiện JSON không phải command hợp lệ, vẫn chuyển đổi...");
    cmd = null;
  }

  if (!cmd) {
    console.log("🔄 Không tìm thấy JSON command hợp lệ, thử chuyển đổi ngôn ngữ tự nhiên...");
    const toolList = getToolListDescription(selectedTools);
    const conversionPrompt = `Yêu cầu của người dùng: "${responseText}"\n\nHãy chuyển yêu cầu trên thành một JSON command để thực thi bằng các tool có sẵn. Bạn BẮT BUỘC phải dùng cấu trúc JSON sau:\n${toolList}\n\nChỉ trả về JSON hợp lệ, không thêm text giải thích, markdown hay bất kỳ văn bản nào khác.`;
    const jsonResponse = await generateText(conversionPrompt, config.model || 'gemini-2.5-flash', 0.1, 8192);
    console.log("🤖 JSON response (lần 2):", jsonResponse);
    cmd = extractJson(jsonResponse);
    if (!cmd) {
      console.error("❌ Vẫn không thể trích xuất JSON từ response");
      return { text: responseText };
    }
    if (!isValidCommand(cmd)) {
      console.error("❌ JSON không phải command hợp lệ sau khi chuyển đổi");
      return { text: responseText };
    }
  }

  console.log("📦 cmd sau khi parse:", cmd);

  // Xử lý trường hợp có key 'actions' (mảng)
  if (cmd.actions && Array.isArray(cmd.actions)) {
    console.log("📦 Phát hiện actions array, sẽ xử lý tuần tự");
    let context: Record<string, any> = {};
    let finalResult: any = null;
    for (let i = 0; i < cmd.actions.length; i++) {
      const item = cmd.actions[i];
      const processedItem = JSON.parse(JSON.stringify(item), (key: string, value: any) => {
        if (typeof value === 'string') {
          return replaceVariables(value, nodeOutputs, context);
        }
        return value;
      });
      let result = await executeSingleCommand(processedItem, selectedTools, transaction, userId, responseText, context, inputData);
      if (result && result.context) {
        context = { ...context, ...result.context };
      }
      finalResult = result;
      if (result && result.error) break;
    }
    return finalResult;
  }

  // Xử lý nếu cmd là array
  if (Array.isArray(cmd)) {
    let context: Record<string, any> = {};
    let finalResult: any = null;
    for (let i = 0; i < cmd.length; i++) {
      const item = cmd[i];
      const processedItem = JSON.parse(JSON.stringify(item), (key: string, value: any) => {
        if (typeof value === 'string') {
          return replaceVariables(value, nodeOutputs, context);
        }
        return value;
      });
      let result = await executeSingleCommand(processedItem, selectedTools, transaction, userId, responseText, context, inputData);
      if (result && result.context) {
        context = { ...context, ...result.context };
      }
      finalResult = result;
      if (result && result.error) break;
    }
    return finalResult;
  } else {
    return await executeSingleCommand(cmd, selectedTools, transaction, userId, responseText, {}, inputData);
  }
}

async function executeSingleCommand(
  cmd: any,
  selectedTools: number[],
  transaction: sql.Transaction,
  userId: number,
  responseText: string,
  context: Record<string, any>,
  inputData?: any
) {
  // Normalize command parameters
  if (cmd.command && cmd.parameters) {
    cmd.action = cmd.command;
    Object.assign(cmd, cmd.parameters);
  }
  if (cmd.tool && cmd.parameters) {
    cmd.action = cmd.tool;
    Object.assign(cmd, cmd.parameters);
  }

  // ========== Chuẩn hóa action ==========
  const rawActionStr = (cmd.action || cmd.tool_code || '').toLowerCase();
  if (rawActionStr.includes('search') || rawActionStr.includes('tìm')) {
    cmd.action = 'search_emails';
  } else if (rawActionStr.includes('send') || rawActionStr.includes('gửi') || rawActionStr.includes('mail')) {
    cmd.action = 'send_email';
  } else if (rawActionStr.includes('write') || rawActionStr.includes('ghi') || rawActionStr.includes('cập nhật')) {
    cmd.action = 'write_sheet';
  } else if (rawActionStr.includes('create') || rawActionStr.includes('tạo')) {
    cmd.action = 'create_sheet';
  } else if (rawActionStr.includes('read') || rawActionStr.includes('đọc') || rawActionStr.includes('lấy')) {
    cmd.action = 'read_sheet';
  }

  // Map email fields
  if (cmd.recipient && !cmd.to) cmd.to = cmd.recipient;
  if (cmd.send_to && !cmd.to) cmd.to = cmd.send_to;
  if (cmd.email_to && !cmd.to) cmd.to = cmd.email_to;
  if (cmd.email && !cmd.to) cmd.to = cmd.email;
  if (cmd.title && !cmd.subject) cmd.subject = cmd.title;

  // Suy luận action nếu chưa có (Fallback cuối cùng)
  if (!cmd.action) {
    if (cmd.to || cmd.subject || cmd.body) cmd.action = 'send_email';
    else if (cmd.query || cmd.from || cmd.days || cmd.search) cmd.action = 'search_emails';
    else if (cmd.spreadsheetId || cmd.sheet_url || cmd.spreadsheet_id) {
      if (cmd.values || cmd.data) cmd.action = 'write_sheet';
      else if (cmd.title || cmd.sheet_name) cmd.action = 'create_sheet';
      else cmd.action = 'read_sheet';
    }
  }

  const refreshTokenIfNeeded = async (toolId: number): Promise<{ AccessToken: string, RefreshToken: string } | null> => {
    const tokenRes = await transaction.request()
      .input("userId", sql.Int, userId)
      .input("toolId", sql.Int, toolId)
      .query(`SELECT AccessToken, RefreshToken, ExpiresAt FROM UserToolAuth WHERE UserId = @userId AND ToolId = @toolId`);
    if (tokenRes.recordset.length === 0) return null;
    let { AccessToken, RefreshToken, ExpiresAt } = tokenRes.recordset[0];
    const now = new Date();
    if (new Date(ExpiresAt) <= now) {
      console.log(`🔄 Token expired for tool ${toolId}, refreshing...`);
      if (!RefreshToken) throw new Error('No refresh token available');
      const configRes = await transaction.request()
        .input("userId", sql.Int, userId)
        .input("toolId", sql.Int, toolId)
        .query(`SELECT ClientId, ClientSecret, TokenUrl FROM UserToolConfig WHERE UserId = @userId AND ToolId = @toolId`);
      if (configRes.recordset.length === 0) throw new Error('Missing client config');
      const { ClientId, ClientSecret, TokenUrl } = configRes.recordset[0];
      const refreshRes = await axios.post(TokenUrl, {
        client_id: ClientId,
        client_secret: ClientSecret,
        refresh_token: RefreshToken,
        grant_type: 'refresh_token'
      });
      AccessToken = refreshRes.data.access_token;
      const newExpiresAt = new Date(Date.now() + refreshRes.data.expires_in * 1000);
      await transaction.request()
        .input("userId", sql.Int, userId)
        .input("toolId", sql.Int, toolId)
        .input("accessToken", sql.NVarChar, AccessToken)
        .input("expiresAt", sql.DateTime, newExpiresAt)
        .query(`
          UPDATE UserToolAuth SET AccessToken = @accessToken, ExpiresAt = @expiresAt, UpdatedAt = GETDATE()
          WHERE UserId = @userId AND ToolId = @toolId
        `);
      console.log(`✅ Token refreshed for tool ${toolId}`);
    }
    return { AccessToken, RefreshToken };
  };

  // ========== GMAIL ==========
  if (selectedTools.includes(1)) {
    if (cmd.action === 'send_email') {
      try {
        if (!cmd.to || cmd.to === 'người dùng hiện tại' || cmd.to.includes('người dùng')) {
          return { error: 'Invalid recipient', text: responseText };
        }
        if (cmd.to.includes('@gmail.inbox')) cmd.to = cmd.to.replace('.inbox', '.com');

        console.log("🔄 Đang refresh token cho Gmail...");
        const tokenInfo = await refreshTokenIfNeeded(1);
        if (!tokenInfo) return { error: 'Gmail not connected', text: responseText };
        const { AccessToken } = tokenInfo;

        const userRes = await transaction.request()
          .input("userId", sql.Int, userId)
          .query(`SELECT Email FROM Users WHERE UserId = @userId`);
        const userEmail = userRes.recordset[0]?.Email;
        if (!userEmail) return { error: 'User email not found', text: responseText };
        console.log(`📧 Email người gửi: ${userEmail}`);

        const subject = cmd.subject || 'Workflow Notification';
        const encodedSubject = `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;

        let body = cmd.body || '';
        body = body.replace(/\{\{([^}]+)\}\}/g, (match: string, key: string) => {
          if (context[key] !== undefined) return context[key];
          return match;
        });

        const emailContent = [
          `From: ${userEmail}`,
          `To: ${cmd.to}`,
          encodedSubject,
          '',
          body
        ].join('\r\n');

        const encodedEmail = Buffer.from(emailContent)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        console.log("📤 Đang gửi email tới:", cmd.to);
        const response = await axios.post(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
          { raw: encodedEmail },
          { headers: { 'Authorization': `Bearer ${AccessToken}`, 'Content-Type': 'application/json' } }
        );
        console.log("✅ Gmail API response:", response.data);
        return { success: true, message: 'Email sent', text: `Đã gửi email đến ${cmd.to}` };
      } catch (apiErr: any) {
        console.error("❌ Gmail API error:", apiErr.response?.data || apiErr.message);
        return { error: apiErr.response?.data?.error?.message || apiErr.message, text: responseText };
      }
    } else if (cmd.action === 'search_emails') {
      try {
        console.log("🔍 Searching emails...");
        const tokenInfo = await refreshTokenIfNeeded(1);
        if (!tokenInfo) return { error: 'Gmail not connected', text: responseText };
        const { AccessToken } = tokenInfo;

        let query = cmd.query || '';
        if (!query && cmd.from) query = `from:${cmd.from}`;
        if (!query && cmd.to) query = `to:${cmd.to}`;
        if (!query && cmd.subject) query = `subject:${cmd.subject}`;
        if (!query && cmd.days) query = `newer_than:${cmd.days}d`;
        if (!query && cmd.search) query = cmd.search;
        const maxResults = cmd.maxResults || 10;

        const listRes = await axios.get(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages`,
          { headers: { 'Authorization': `Bearer ${AccessToken}` }, params: { q: query, maxResults } }
        );

        const messages = listRes.data.messages || [];
        if (messages.length === 0) return { success: true, emails: [], message: 'No emails found', text: 'Không tìm thấy email nào' };

        const emailDetails = await Promise.all(
          messages.map(async (msg: any) => {
            const detailRes = await axios.get(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
              { headers: { 'Authorization': `Bearer ${AccessToken}` } }
            );
            const payload = detailRes.data.payload;
            let from = '', subject = '', date = '';
            if (payload.headers) {
              from = payload.headers.find((h: any) => h.name === 'From')?.value || '';
              subject = payload.headers.find((h: any) => h.name === 'Subject')?.value || '';
              date = payload.headers.find((h: any) => h.name === 'Date')?.value || '';
            }
            let body = '';
            if (payload.parts) {
              const part = payload.parts.find((p: any) => p.mimeType === 'text/plain');
              if (part && part.body.data) body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            } else if (payload.body && payload.body.data) {
              body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
            }
            return { id: msg.id, from, subject, date, body: body.substring(0, 500) };
          })
        );
        return { success: true, emails: emailDetails, count: emailDetails.length, text: `Tìm thấy ${emailDetails.length} email` };
      } catch (apiErr: any) {
        console.error("❌ Gmail search API error:", apiErr.response?.data || apiErr.message);
        return { error: apiErr.response?.data?.error?.message || apiErr.message, text: responseText };
      }
    }
  }

  // ========== GOOGLE SHEETS ==========
  if (selectedTools.includes(2)) {
    try {
      const tokenInfo = await refreshTokenIfNeeded(2);
      if (!tokenInfo) return { error: 'Google Sheets not connected', text: responseText };
      const { AccessToken } = tokenInfo;

      if (cmd.action === 'read_sheet') {
        let spreadsheetId = cmd.spreadsheetId || cmd.spreadsheet_id;
        if (!spreadsheetId && cmd.sheet_url) {
          const match = cmd.sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
          if (match) spreadsheetId = match[1];
        }
        if (!spreadsheetId && inputData && typeof inputData === 'string') {
          const match = inputData.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
          if (match) spreadsheetId = match[1];
        }
        if (!spreadsheetId) return { error: 'Missing spreadsheetId', text: responseText };
        const range = cmd.range || 'Sheet1';
        console.log(`📖 Đang đọc sheet ${spreadsheetId}, range: ${range}`);
        const sheetsRes = await axios.get(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
          { headers: { 'Authorization': `Bearer ${AccessToken}` } }
        );
        return { success: true, data: sheetsRes.data.values, text: `Đã đọc sheet thành công` };
      }

      if (cmd.action === 'write_sheet') {
        let spreadsheetId = cmd.spreadsheetId || cmd.spreadsheet_id;
        if (!spreadsheetId && context && context.last_sheet_id) spreadsheetId = context.last_sheet_id;
        if (!spreadsheetId && (cmd.sheet_name || cmd.title)) {
          const sheetTitle = cmd.sheet_name || cmd.title || 'New Spreadsheet';
          console.log(`🔧 Không có spreadsheetId, sẽ tạo sheet mới với tên: ${sheetTitle}`);
          const createRes = await axios.post(
            'https://sheets.googleapis.com/v4/spreadsheets',
            { properties: { title: sheetTitle } },
            { headers: { 'Authorization': `Bearer ${AccessToken}`, 'Content-Type': 'application/json' } }
          );
          spreadsheetId = createRes.data.spreadsheetId;
          const newSheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
          console.log(`✅ Đã tạo sheet mới ID: ${spreadsheetId}`);
          context.last_sheet_id = spreadsheetId;
          context.spreadsheetUrl = newSheetUrl;
        }
        if (!spreadsheetId) return { error: 'Missing spreadsheetId', text: responseText };
        
        let range = cmd.range || 'A1';
        // Nếu range có dạng "SheetName!A1", lấy phần sau dấu !
        if (range.includes('!')) {
          const parts = range.split('!');
          range = parts[parts.length - 1]; // lấy phần A1
        }
        
        let values = cmd.values || cmd.data;
        if (!values && cmd.value) values = [[String(cmd.value)]];
        if (!values) return { error: 'Missing data to write', text: responseText };
        if (!Array.isArray(values)) values = [[String(values)]];
        if (!Array.isArray(values[0])) values = [values];
        
        await axios.put(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
          { values },
          { headers: { 'Authorization': `Bearer ${AccessToken}`, 'Content-Type': 'application/json' } }
        );
        return { success: true, spreadsheetId, text: `Đã ghi dữ liệu vào sheet ${range}` };
      }
      if (cmd.action === 'create_sheet') {
        const createRes = await axios.post(
          'https://sheets.googleapis.com/v4/spreadsheets',
          { properties: { title: cmd.title || 'New Spreadsheet' } },
          { headers: { 'Authorization': `Bearer ${AccessToken}`, 'Content-Type': 'application/json' } }
        );
        const spreadsheetId = createRes.data.spreadsheetId;
        const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
        context.last_sheet_id = spreadsheetId;
        context.spreadsheetUrl = spreadsheetUrl;

        // Nếu có dữ liệu ban đầu (initialData) thì ghi luôn
        let initialData = cmd.initialData || cmd.values || cmd.data;
        if (initialData) {
          if (!Array.isArray(initialData)) initialData = [[String(initialData)]];
          if (!Array.isArray(initialData[0])) initialData = [initialData];
          const range = cmd.range || 'A1';
          await axios.put(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
            { values: initialData },
            { headers: { 'Authorization': `Bearer ${AccessToken}`, 'Content-Type': 'application/json' } }
          );
          return { success: true, spreadsheetId, spreadsheetUrl, message: 'Sheet created with initial data', text: `Đã tạo sheet và ghi dữ liệu vào ${range}` };
        }
        return { success: true, spreadsheetId, spreadsheetUrl, message: 'Sheet created', text: `Đã tạo sheet mới: ${spreadsheetUrl}`, context: { last_sheet_id: spreadsheetId, spreadsheetUrl } };
      }
    } catch (apiErr: any) {
      console.error("❌ Sheets API error:", apiErr.response?.data || apiErr.message);
      return { error: apiErr.response?.data?.error?.message || apiErr.message, text: responseText };
    }
  }

  return { text: responseText };
}