// workflowRoutes.ts
import express from "express";
import axios from "axios";
import { getDbConnection, sql } from "../lib/db.ts";
import { authenticateToken } from "../middlewares/auth.ts";
import { processAIAgent } from "../services/aiAgentService.ts";
import { parseFile } from "../services/fileParserService.ts";
import { registerScheduledWorkflow, unregisterScheduledWorkflow } from '../services/schedulerService.ts';
import { generateText } from "../services/geminiService.ts";

const router = express.Router();

// Save workflow
router.post("/save", authenticateToken, async (req: any, res) => {
  const { name, nodes, edges, workflowId } = req.body;
  const userId = req.user.userId;
  try {
    const db = await getDbConnection();
    const transaction = new sql.Transaction(db);
    await transaction.begin();
    try {
      let activeWfId = workflowId;
      if (!activeWfId) {
        const wf = await transaction.request()
          .input("userId", sql.Int, userId)
          .input("name", sql.NVarChar, name)
          .query(`
            INSERT INTO Workflows (UserId, WorkflowName, CreatedAt)
            OUTPUT INSERTED.WorkflowId
            VALUES (@userId, @name, GETUTCDATE())
          `);
        activeWfId = wf.recordset[0].WorkflowId;
      }

      // Xóa các bảng liên quan
      await transaction.request()
        .input("wfId", sql.Int, activeWfId)
        .query(`DELETE FROM ExecutionSteps WHERE WorkflowId = @wfId`);

      await transaction.request()
        .input("wfId", sql.Int, activeWfId)
        .query(`DELETE FROM WorkflowExecutions WHERE WorkflowId = @wfId`);

      await transaction.request()
        .input("wfId", sql.Int, activeWfId)
        .query(`DELETE FROM Edges WHERE WorkflowId = @wfId`);

      await transaction.request()
        .input("wfId", sql.Int, activeWfId)
        .query(`DELETE FROM Nodes WHERE WorkflowId = @wfId`);

      // Insert nodes mới
      for (const node of nodes) {
        await transaction.request()
          .input("nodeId", sql.NVarChar, node.id)
          .input("wfId", sql.Int, activeWfId)
          .input("type", sql.NVarChar, node.type)
          .input("label", sql.NVarChar, node.data.label || "node")
          .input("posX", sql.Float, node.position.x)
          .input("posY", sql.Float, node.position.y)
          .input("config", sql.NVarChar, JSON.stringify(node.data))
          .query(`
            INSERT INTO Nodes (NodeId, WorkflowId, NodeType, Label, PosX, PosY, DataConfig)
            VALUES (@nodeId, @wfId, @type, @label, @posX, @posY, @config)
          `);
      }

      // Insert edges mới
      for (const edge of edges) {
        const request = transaction.request()
          .input("edgeId", sql.NVarChar, edge.id)
          .input("wfId", sql.Int, activeWfId)
          .input("source", sql.NVarChar, edge.source)
          .input("target", sql.NVarChar, edge.target)
          .input("sourceHandle", sql.NVarChar, edge.sourceHandle || null)
          .input("targetHandle", sql.NVarChar, edge.targetHandle || null)
          .input("edgeType", sql.NVarChar, edge.type || 'default');

        await request.query(`
          INSERT INTO Edges (EdgeId, WorkflowId, SourceNodeId, TargetNodeId, SourceHandle, TargetHandle, EdgeType)
          VALUES (@edgeId, @wfId, @source, @target, @sourceHandle, @targetHandle, @edgeType)
        `);
      }

      await transaction.commit();

      // Xử lý scheduler node – tắt lịch nếu không còn node Scheduler
      const schedulerNodes = nodes.filter((n: any) => n.data.label === 'Scheduler');
      if (schedulerNodes.length === 0) {
        // Không có node Scheduler => hủy lịch (nếu có)
        await unregisterScheduledWorkflow(activeWfId);
      } else {
        for (const schedulerNode of schedulerNodes) {
          const cron = schedulerNode.data.cronExpression;
          const nodeId = schedulerNode.id;
          if (cron) {
            await registerScheduledWorkflow(userId, activeWfId, nodeId, cron);
          } else {
            await unregisterScheduledWorkflow(activeWfId);
          }
        }
      }

      res.json({ message: "workflow saved", workflowId: activeWfId });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err: any) {
    console.error("🔥 Lỗi lưu workflow:", err);
    res.status(500).json({ message: "db error", error: err.message });
  }
});

// Load workflow by id
router.get("/:id", authenticateToken, async (req: any, res) => {
  try {
    const workflowId = req.params.id;
    const userId = req.user.userId;
    const db = await getDbConnection();
    const wfCheck = await db.request()
      .input("wfId", sql.Int, workflowId)
      .input("userId", sql.Int, userId)
      .query(`SELECT WorkflowName FROM Workflows WHERE WorkflowId = @wfId AND UserId = @userId`);
    if (wfCheck.recordset.length === 0) {
      return res.status(404).json({ message: "Workflow not found" });
    }
    const workflowName = wfCheck.recordset[0].WorkflowName;
    const nodes = await db.request()
      .input("wfId", sql.Int, workflowId)
      .query(`SELECT * FROM Nodes WHERE WorkflowId = @wfId`);
    const edges = await db.request()
      .input("wfId", sql.Int, workflowId)
      .query(`SELECT * FROM Edges WHERE WorkflowId = @wfId`);
    res.json({
      workflowId: Number(workflowId),
      name: workflowName,
      nodes: nodes.recordset,
      edges: edges.recordset
    });
  } catch (err: any) {
    console.error("🔥 Lỗi load workflow:", err);
    res.status(500).json({ message: "server error" });
  }
});

// Run workflow
router.post("/run/:workflowId", authenticateToken, async (req: any, res) => {
  const workflowId = req.params.workflowId;
  const userId = req.user.userId; // có thể là null đối với system token
  try {
    const db = await getDbConnection();
    const transaction = new sql.Transaction(db);
    await transaction.begin();
    try {
      // Lấy userId thực của chủ workflow nếu là system token
      let effectiveUserId = userId;
      if (userId === null) {
        const wfOwner = await transaction.request()
          .input("wfId", sql.Int, workflowId)
          .query(`SELECT UserId FROM Workflows WHERE WorkflowId = @wfId`);
        if (wfOwner.recordset.length === 0) {
          await transaction.rollback();
          return res.status(404).json({ message: "Workflow not found" });
        }
        effectiveUserId = wfOwner.recordset[0].UserId;
      }

      // Kiểm tra quyền (nếu không phải system token)
      if (userId !== null) {
        const wfCheck = await transaction.request()
          .input("wfId", sql.Int, workflowId)
          .input("userId", sql.Int, effectiveUserId!)
          .query(`SELECT WorkflowId FROM Workflows WHERE WorkflowId = @wfId AND UserId = @userId`);
        if (wfCheck.recordset.length === 0) {
          await transaction.rollback();
          return res.status(404).json({ message: "Workflow not found" });
        }
      }

      const execResult = await transaction.request()
        .input("wfId", sql.Int, workflowId)
        .query(`
          INSERT INTO WorkflowExecutions (WorkflowId, Status, StartedAt)
          OUTPUT INSERTED.ExecutionId
          VALUES (@wfId, 'running', GETUTCDATE())
        `);
      const executionId = execResult.recordset[0].ExecutionId;

      const nodes = await transaction.request()
        .input("wfId", sql.Int, workflowId)
        .query(`SELECT * FROM Nodes WHERE WorkflowId = @wfId`);
      const edges = await transaction.request()
        .input("wfId", sql.Int, workflowId)
        .query(`SELECT * FROM Edges WHERE WorkflowId = @wfId`);

      const nodeMap = new Map(nodes.recordset.map((n: any) => [n.NodeId, n]));
      const edgeMap = new Map();
      edges.recordset.forEach((e: any) => {
        if (!edgeMap.has(e.SourceNodeId)) edgeMap.set(e.SourceNodeId, []);
        edgeMap.get(e.SourceNodeId).push(e);
      });

      const startNode = nodes.recordset.find((n: any) => n.NodeType === 'start');
      if (!startNode) throw new Error("No start node");

      let currentNodeId = startNode.NodeId;
      let inputData = null;
      let outputData = null;
      const nodeOutputs: Record<string, any> = {};

      while (currentNodeId) {
        const node = nodeMap.get(currentNodeId);
        if (!node) break;
        const config = node.DataConfig ? JSON.parse(node.DataConfig) : {};
        let nodeOutput;

        if (node.NodeType === 'start') {
          nodeOutput = { message: "Workflow started" };
        } else if (node.NodeType === 'end') {
          nodeOutput = { final: outputData };
          break;
        } else if (node.NodeType === 'action') {
          if (config.label === 'LLM') {
            const prompt = `${config.systemPrompt || ''}\nInput: ${JSON.stringify(inputData)}`;
            const response = await generateText(
              prompt,
              config.model || 'gemini-2.5-flash',
              config.temperature || 0.2
            );
            nodeOutput = { response };
          } else if (config.label === 'AI Agent') {
            nodeOutput = await processAIAgent(node, inputData, transaction, effectiveUserId!, nodeOutputs);
          } else if (config.label === 'File Parser') {
            nodeOutput = await parseFile(config, inputData, transaction, effectiveUserId!, nodeOutputs);
          } else {
            nodeOutput = { message: `Action ${config.label} processed` };
          }
        } else {
          nodeOutput = { message: `Unknown node type` };
        }

        nodeOutputs[node.NodeId] = nodeOutput;
        console.log(`📦 Output của node ${node.NodeId}:`, nodeOutput);
        console.log(`📦 nodeOutputs hiện tại có các keys:`, Object.keys(nodeOutputs));

        outputData = nodeOutput;

        await transaction.request()
          .input("executionId", sql.Int, executionId)
          .input("nodeId", sql.NVarChar, node.NodeId)
          .input("wfId", sql.Int, workflowId)
          .input("inputData", sql.NVarChar, inputData ? JSON.stringify(inputData) : null)
          .input("outputData", sql.NVarChar, JSON.stringify(nodeOutput))
          .input("status", sql.NVarChar, 'completed')
          .query(`
            INSERT INTO ExecutionSteps (ExecutionId, NodeId, WorkflowId, InputData, OutputData, Status, FinishedAt)
            VALUES (@executionId, @nodeId, @wfId, @inputData, @outputData, @status, GETUTCDATE())
          `);

        const outgoing = edgeMap.get(currentNodeId) || [];
        if (outgoing.length === 0) break;
        const nextEdge = outgoing[0];
        currentNodeId = nextEdge.TargetNodeId;
        inputData = nodeOutput;
      }

      await transaction.request()
        .input("executionId", sql.Int, executionId)
        .input("outputData", sql.NVarChar, JSON.stringify(outputData))
        .query(`
          UPDATE WorkflowExecutions SET Status = 'completed', OutputData = @outputData, FinishedAt = GETUTCDATE()
          WHERE ExecutionId = @executionId
        `);

      await transaction.commit();
      res.json({ message: "Workflow executed", output: outputData });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err: any) {
    console.error("🔥 Lỗi chạy workflow:", err);
    res.status(500).json({ message: "db error", error: err.message });
  }
});

// Tắt lịch tự động cho workflow
router.post("/stop-schedule/:workflowId", authenticateToken, async (req: any, res) => {
  const workflowId = req.params.workflowId;
  const userId = req.user.userId;
  try {
    const db = await getDbConnection();
    const wfCheck = await db.request()
      .input("wfId", sql.Int, workflowId)
      .input("userId", sql.Int, userId)
      .query(`SELECT WorkflowId FROM Workflows WHERE WorkflowId = @wfId AND UserId = @userId`);
    if (wfCheck.recordset.length === 0) {
      return res.status(404).json({ message: "Workflow not found" });
    }
    await unregisterScheduledWorkflow(parseInt(workflowId));
    res.json({ message: "Scheduler stopped" });
  } catch (err: any) {
    console.error("🔥 Lỗi stop schedule:", err);
    res.status(500).json({ message: "server error" });
  }
});

// Delete workflow
router.delete("/:id", authenticateToken, async (req: any, res) => {
  const workflowId = req.params.id;
  const userId = req.user.userId;
  try {
    const db = await getDbConnection();
    const transaction = new sql.Transaction(db);
    await transaction.begin();
    try {
      const wfCheck = await transaction.request()
        .input("wfId", sql.Int, workflowId)
        .input("userId", sql.Int, userId)
        .query(`SELECT WorkflowId FROM Workflows WHERE WorkflowId = @wfId AND UserId = @userId`);
      if (wfCheck.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ message: "Workflow not found" });
      }

      await transaction.request()
        .input("wfId", sql.Int, workflowId)
        .query(`DELETE FROM ExecutionSteps WHERE WorkflowId = @wfId`);

      await transaction.request()
        .input("wfId", sql.Int, workflowId)
        .query(`DELETE FROM WorkflowExecutions WHERE WorkflowId = @wfId`);

      await transaction.request()
        .input("wfId", sql.Int, workflowId)
        .query(`DELETE FROM Edges WHERE WorkflowId = @wfId`);

      await transaction.request()
        .input("wfId", sql.Int, workflowId)
        .query(`DELETE FROM Nodes WHERE WorkflowId = @wfId`);

      await transaction.request()
        .input("wfId", sql.Int, workflowId)
        .query(`DELETE FROM Workflows WHERE WorkflowId = @wfId`);

      await transaction.commit();
      await unregisterScheduledWorkflow(workflowId);
      res.json({ message: "Workflow deleted" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err: any) {
    console.error("🔥 Lỗi xóa workflow:", err);
    res.status(500).json({ message: "db error", error: err.message });
  }
});

// LLM execute (test)
router.post("/execute-llm", authenticateToken, async (req, res) => {
  try {
    const { prompt, model = "gemini-2.5-flash" } = req.body;
    const output = await generateText(prompt, model, 0.2);
    res.json({ output });
  } catch (err: any) {
    res.status(500).json({ message: "Gemini error", error: err.message });
  }
});

export default router;