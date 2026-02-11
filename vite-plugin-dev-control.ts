import { Plugin } from 'vite';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let backendProcess: any = null;

/**
 * Vite plugin that adds development server control endpoints
 * Allows the frontend to start/stop the backend server via HTTP requests
 */
export function devControlPlugin(): Plugin {
  return {
    name: 'dev-control',
    configureServer(server) {
      server.middlewares.use('/__dev/start-backend', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        try {
          // Check if backend is already running
          try {
            const checkResponse = await fetch('http://localhost:5000/api/storage/info');
            if (checkResponse.ok) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                message: 'Backend is already running',
                alreadyRunning: true
              }));
              return;
            }
          } catch (e) {
            // Backend not running, proceed to start it
          }

          // Kill any existing processes on port 5000 first
          try {
            if (process.platform === 'win32') {
              await execAsync('npx kill-port 5000');
            } else {
              await execAsync('lsof -ti:5000 | xargs kill -9');
            }
            // Wait a bit for the port to be freed
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (e) {
            // Port might already be free, continue
          }

          // Start the backend server
          console.log('🚀 Starting backend server on port 5000...');

          backendProcess = spawn('npm', ['run', 'dev:server'], {
            cwd: process.cwd(),
            shell: true,
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe']
          });

          backendProcess.stdout?.on('data', (data: Buffer) => {
            console.log(`[backend] ${data.toString()}`);
          });

          backendProcess.stderr?.on('data', (data: Buffer) => {
            console.error(`[backend] ${data.toString()}`);
          });

          backendProcess.on('error', (error: Error) => {
            console.error('Failed to start backend:', error);
          });

          // Wait for backend to be ready (poll for up to 30 seconds)
          let attempts = 0;
          const maxAttempts = 60; // 30 seconds (500ms * 60)

          while (attempts < maxAttempts) {
            try {
              const checkResponse = await fetch('http://localhost:5000/api/storage/info');
              if (checkResponse.ok) {
                console.log('✅ Backend server is ready!');
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  message: 'Backend server started successfully'
                }));
                return;
              }
            } catch (e) {
              // Not ready yet, continue polling
            }

            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
          }

          // Timeout
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            message: 'Backend server started but not responding yet. Please wait a few seconds and refresh.'
          }));

        } catch (error) {
          console.error('Error starting backend:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to start backend server'
          }));
        }
      });

      server.middlewares.use('/__dev/check-backend', async (req, res) => {
        try {
          const checkResponse = await fetch('http://localhost:5000/api/storage/info');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            running: checkResponse.ok
          }));
        } catch (e) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            running: false
          }));
        }
      });
    }
  };
}
