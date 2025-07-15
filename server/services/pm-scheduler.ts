import { pmEngine } from "./pm-engine";
import { storage } from "../storage";

export class PMScheduler {
  private static instance: PMScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): PMScheduler {
    if (!PMScheduler.instance) {
      PMScheduler.instance = new PMScheduler();
    }
    return PMScheduler.instance;
  }

  /**
   * Start the PM automation scheduler
   * Runs every hour to check for due PMs
   */
  public start(): void {
    if (this.isRunning) {
      console.log('PM Scheduler is already running');
      return;
    }

    console.log('Starting PM Scheduler...');
    this.isRunning = true;

    // Run immediately on start
    this.runScheduledCheck();

    // Then run every hour
    this.intervalId = setInterval(() => {
      this.runScheduledCheck();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Stop the PM automation scheduler
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('PM Scheduler stopped');
  }

  /**
   * Run the scheduled PM check for all warehouses
   */
  private async runScheduledCheck(): Promise<void> {
    try {
      console.log('Running scheduled PM check...');
      
      const warehouses = await storage.getWarehouses();
      
      for (const warehouse of warehouses) {
        if (warehouse.active) {
          console.log(`Running PM automation for warehouse: ${warehouse.name}`);
          const result = await pmEngine.runPMAutomation(warehouse.id);
          
          if (result.generated > 0) {
            console.log(`Generated ${result.generated} PM work orders for warehouse ${warehouse.name}`);
          }
          
          if (result.errors.length > 0) {
            console.error(`PM automation errors for warehouse ${warehouse.name}:`, result.errors);
          }
        }
      }
      
      console.log('Scheduled PM check completed');
    } catch (error) {
      console.error('Error in scheduled PM check:', error);
    }
  }

  /**
   * Run PM check for a specific warehouse
   */
  public async runForWarehouse(warehouseId: string): Promise<void> {
    try {
      console.log(`Running PM check for warehouse: ${warehouseId}`);
      const result = await pmEngine.runPMAutomation(warehouseId);
      
      if (result.generated > 0) {
        console.log(`Generated ${result.generated} PM work orders`);
      }
      
      if (result.errors.length > 0) {
        console.error('PM automation errors:', result.errors);
      }
    } catch (error) {
      console.error('Error in warehouse PM check:', error);
    }
  }

  /**
   * Get scheduler status
   */
  public getStatus(): { isRunning: boolean; nextRun?: Date } {
    return {
      isRunning: this.isRunning,
      nextRun: this.isRunning ? new Date(Date.now() + 60 * 60 * 1000) : undefined
    };
  }
}

export const pmScheduler = PMScheduler.getInstance();
