import { exec } from 'child_process';
import { promisify } from 'util';
import { rm } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

async function findNodeProcesses() {
  try {
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH');
    return stdout.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [_, pid] = line.match(/"([^"]+)"/g) || [];
        return pid ? pid.replace(/"/g, '') : null;
      })
      .filter(Boolean);
  } catch (error) {
    console.error('Error finding Node processes:', error);
    return [];
  }
}

async function cleanNuxtCache() {
  try {
    console.log('Cleaning Nuxt cache...');
    const nuxtDirs = ['.nuxt', '.output', 'node_modules/.vite', 'node_modules/.cache'];
    
    for (const dir of nuxtDirs) {
      try {
        await rm(join(process.cwd(), dir), { recursive: true, force: true });
        console.log(`Cleaned ${dir}`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`Error cleaning ${dir}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning Nuxt cache:', error);
  }
}

async function killProcess(pid) {
  try {
    // Always use force termination for reliability
    await execAsync(`taskkill /F /PID ${pid}`);
    console.log(`Terminated process ${pid}`);
    return true;
  } catch (error) {
    // Only log real errors, not "process already gone" errors
    if (!error.stderr?.includes('could not be terminated') && 
        !error.stderr?.includes('no running instance')) {
      console.error(`Error terminating process ${pid}:`, error);
    }
    return false;
  }
}

async function terminateProcesses(pids) {
  const results = await Promise.allSettled(
    pids.map(pid => killProcess(pid))
  );
  
  return results.filter(r => r.status === 'fulfilled' && r.value).length;
}

async function gracefulShutdown() {
  try {
    console.log('Starting shutdown...');

    // Clean Nuxt cache first
    await cleanNuxtCache();

    // Get initial process list
    let pids = await findNodeProcesses();
    if (pids.length === 0) {
      console.log('No Node.js processes found.');
      return;
    }

    console.log(`Found ${pids.length} Node.js processes`);

    // Terminate all processes
    let terminatedCount = await terminateProcesses(pids);
    console.log(`Successfully terminated ${terminatedCount} processes`);

    // Quick second pass for any remaining processes
    pids = await findNodeProcesses();
    if (pids.length > 0) {
      console.log(`Found ${pids.length} remaining processes, attempting final termination...`);
      terminatedCount = await terminateProcesses(pids);
      console.log(`Successfully terminated ${terminatedCount} remaining processes`);
      
      // Final check
      pids = await findNodeProcesses();
      if (pids.length > 0) {
        console.warn('Warning: Some processes could not be terminated:', pids);
      }
    }

    console.log('Shutdown complete.');
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Execute shutdown
gracefulShutdown();
