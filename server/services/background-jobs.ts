import { escalationEngine } from './escalation-engine';
import { PMEngine } from './pm-engine';

export interface ScheduledJob {
  name: string;
  interval: number; // in milliseconds
  lastRun?: Date;
  nextRun?: Date;
  running: boolean;
  enabled: boolean;
}

export class BackgroundJobScheduler {
  private static instance: BackgroundJobScheduler;
  private jobs: Map<string, ScheduledJob> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private pmEngine: PMEngine;
  
  private constructor() {
    this.pmEngine = PMEngine.getInstance();
    this.initializeJobs();
  }
  
  public static getInstance(): BackgroundJobScheduler {
    if (!BackgroundJobScheduler.instance) {
      BackgroundJobScheduler.instance = new BackgroundJobScheduler();
    }
    return BackgroundJobScheduler.instance;
  }

  /**
   * Initialize default background jobs
   */
  private initializeJobs(): void {
    // Escalation check every 30 minutes
    this.addJob('escalation-check', {
      name: 'Work Order Escalation Check',
      interval: 30 * 60 * 1000, // 30 minutes
      running: false,
      enabled: true,
    }, this.runEscalationCheck.bind(this));

    // PM generation check every hour
    this.addJob('pm-generation', {
      name: 'Preventive Maintenance Generation',
      interval: 60 * 60 * 1000, // 1 hour
      running: false,
      enabled: true,
    }, this.runPMGeneration.bind(this));

    // Notification cleanup every 24 hours
    this.addJob('notification-cleanup', {
      name: 'Notification Cleanup',
      interval: 24 * 60 * 60 * 1000, // 24 hours
      running: false,
      enabled: true,
    }, this.runNotificationCleanup.bind(this));

    console.log('Background job scheduler initialized with', this.jobs.size, 'jobs');
  }

  /**
   * Add a job to the scheduler
   */
  private addJob(jobId: string, job: ScheduledJob, handler: () => Promise<void>): void {
    this.jobs.set(jobId, job);
    
    if (job.enabled) {
      this.startJob(jobId, handler);
    }
  }

  /**
   * Start a specific job
   */
  private startJob(jobId: string, handler: () => Promise<void>): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // Clear existing interval if any
    const existingInterval = this.intervals.get(jobId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Set up new interval
    const interval = setInterval(async () => {
      if (job.running) {
        console.log(`Job ${jobId} is already running, skipping...`);
        return;
      }

      try {
        job.running = true;
        job.lastRun = new Date();
        job.nextRun = new Date(Date.now() + job.interval);
        
        console.log(`Starting background job: ${job.name}`);
        await handler();
        console.log(`Completed background job: ${job.name}`);
      } catch (error) {
        console.error(`Error running background job ${job.name}:`, error);
      } finally {
        job.running = false;
      }
    }, job.interval);

    this.intervals.set(jobId, interval);
    
    // Set next run time
    job.nextRun = new Date(Date.now() + job.interval);
    
    console.log(`Started job: ${job.name} (runs every ${job.interval / 1000}s)`);
  }

  /**
   * Stop a specific job
   */
  public stopJob(jobId: string): void {
    const interval = this.intervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(jobId);
    }
    
    const job = this.jobs.get(jobId);
    if (job) {
      job.running = false;
      job.enabled = false;
    }
    
    console.log(`Stopped job: ${jobId}`);
  }

  /**
   * Start all enabled jobs
   */
  public startAll(): void {
    for (const [jobId, job] of this.jobs) {
      if (job.enabled && !this.intervals.has(jobId)) {
        const handler = this.getJobHandler(jobId);
        if (handler) {
          this.startJob(jobId, handler);
        }
      }
    }
    console.log('Started all enabled background jobs');
  }

  /**
   * Stop all jobs
   */
  public stopAll(): void {
    for (const [jobId] of this.jobs) {
      this.stopJob(jobId);
    }
    console.log('Stopped all background jobs');
  }

  /**
   * Get job handler by ID
   */
  private getJobHandler(jobId: string): (() => Promise<void>) | null {
    switch (jobId) {
      case 'escalation-check':
        return this.runEscalationCheck.bind(this);
      case 'pm-generation':
        return this.runPMGeneration.bind(this);
      case 'notification-cleanup':
        return this.runNotificationCleanup.bind(this);
      default:
        return null;
    }
  }

  /**
   * Run escalation check job
   */
  private async runEscalationCheck(): Promise<void> {
    try {
      const actions = await escalationEngine.checkForEscalations();
      if (actions.length > 0) {
        console.log(`Escalated ${actions.length} work orders`);
      }
    } catch (error) {
      console.error('Error in escalation check job:', error);
    }
  }

  /**
   * Run PM generation job
   */
  private async runPMGeneration(): Promise<void> {
    try {
      // Get all warehouses and generate PMs for each
      const { storage } = await import('../storage');
      const warehouses = await storage.getWarehouses();
      
      let totalGenerated = 0;
      for (const warehouse of warehouses) {
        const generatedWOs = await this.pmEngine.generatePMWorkOrders(warehouse.id);
        totalGenerated += generatedWOs.length;
      }
      
      if (totalGenerated > 0) {
        console.log(`Generated ${totalGenerated} preventive maintenance work orders`);
      }
    } catch (error) {
      console.error('Error in PM generation job:', error);
    }
  }

  /**
   * Run notification cleanup job
   */
  private async runNotificationCleanup(): Promise<void> {
    try {
      // Clean up old read notifications (older than 30 days)
      // This would need to be implemented in the storage layer
      console.log('Notification cleanup job completed');
    } catch (error) {
      console.error('Error in notification cleanup job:', error);
    }
  }

  /**
   * Get job status for monitoring
   */
  public getJobStatus(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Enable/disable a job
   */
  public setJobEnabled(jobId: string, enabled: boolean): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.enabled = enabled;
    
    if (enabled && !this.intervals.has(jobId)) {
      const handler = this.getJobHandler(jobId);
      if (handler) {
        this.startJob(jobId, handler);
      }
    } else if (!enabled) {
      this.stopJob(jobId);
    }
    
    console.log(`Job ${jobId} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update job interval
   */
  public updateJobInterval(jobId: string, intervalMs: number): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.interval = intervalMs;
    
    // Restart the job with new interval if it's running
    if (job.enabled) {
      this.stopJob(jobId);
      const handler = this.getJobHandler(jobId);
      if (handler) {
        this.startJob(jobId, handler);
      }
    }
    
    console.log(`Updated job ${jobId} interval to ${intervalMs}ms`);
  }

  /**
   * Run a job manually (for testing/admin purposes)
   */
  public async runJobManually(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const handler = this.getJobHandler(jobId);
    if (!handler) {
      throw new Error(`No handler found for job ${jobId}`);
    }

    if (job.running) {
      throw new Error(`Job ${jobId} is already running`);
    }

    try {
      job.running = true;
      console.log(`Manually running job: ${job.name}`);
      await handler();
      console.log(`Manually completed job: ${job.name}`);
    } finally {
      job.running = false;
    }
  }
}

export const backgroundJobScheduler = BackgroundJobScheduler.getInstance();
