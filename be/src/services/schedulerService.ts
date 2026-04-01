import cron, { ScheduledTask } from 'node-cron';
import axios from 'axios';
import { getDbConnection, sql } from '../lib/db.ts';

interface ScheduledJob {
  workflowId: number;
  nodeId: string;
  cronExpression: string;
  task: ScheduledTask;
}

const jobs = new Map<string, ScheduledJob>();

export async function saveSchedule(workflowId: number, nodeId: string, cronExpression: string) {
  const db = await getDbConnection();
  await db.request()
    .input('workflowId', sql.Int, workflowId)
    .input('nodeId', sql.NVarChar, nodeId)
    .input('cronExpression', sql.NVarChar, cronExpression)
    .query(`
      MERGE WorkflowSchedules AS target
      USING (SELECT @workflowId AS WorkflowId) AS source
      ON target.WorkflowId = source.WorkflowId
      WHEN MATCHED THEN
        UPDATE SET NodeId = @nodeId, CronExpression = @cronExpression, UpdatedAt = GETUTCDATE()
      WHEN NOT MATCHED THEN
        INSERT (WorkflowId, NodeId, CronExpression) VALUES (@workflowId, @nodeId, @cronExpression);
    `);
}

export async function deleteSchedule(workflowId: number) {
  const db = await getDbConnection();
  await db.request()
    .input('workflowId', sql.Int, workflowId)
    .query(`DELETE FROM WorkflowSchedules WHERE WorkflowId = @workflowId`);
}

export function stopJob(workflowId: number) {
  const job = jobs.get(workflowId.toString());
  if (job) {
    job.task.stop();
    jobs.delete(workflowId.toString());
    console.log(`⏰ Stopped scheduled job for workflow ${workflowId}`);
  }
}

export async function startJob(workflowId: number, nodeId: string, cronExpression: string) {
  stopJob(workflowId);
  const task = cron.schedule(cronExpression, async () => {
    console.log(`⏰ Running scheduled workflow ${workflowId} at ${new Date().toISOString()}`);
    try {
      const systemToken = process.env.SYSTEM_TOKEN;
      if (!systemToken) {
        console.error('❌ SYSTEM_TOKEN not set');
        return;
      }
      const response = await axios.post(`http://localhost:3001/api/workflow/run/${workflowId}`, {}, {
        headers: { Authorization: `Bearer ${systemToken}` }
      });
      console.log(`✅ Scheduled workflow ${workflowId} completed`, response.data);
    } catch (err: any) {
      console.error(`❌ Scheduled workflow ${workflowId} failed:`, err.message);
    }
  });
  jobs.set(workflowId.toString(), { workflowId, nodeId, cronExpression, task });
  console.log(`⏰ Scheduled workflow ${workflowId} with cron: ${cronExpression}`);
}

export async function registerScheduledWorkflow(userId: number, workflowId: number, nodeId: string, cronExpression: string) {
  await saveSchedule(workflowId, nodeId, cronExpression);
  await startJob(workflowId, nodeId, cronExpression);
}

export async function unregisterScheduledWorkflow(workflowId: number) {
  await deleteSchedule(workflowId);
  stopJob(workflowId);
}

export async function initScheduledJobs() {
  const db = await getDbConnection();
  const result = await db.request().query(`SELECT WorkflowId, NodeId, CronExpression FROM WorkflowSchedules`);
  for (const row of result.recordset) {
    await startJob(row.WorkflowId, row.NodeId, row.CronExpression);
  }
}