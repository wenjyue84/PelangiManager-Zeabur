import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  pageLoadTime: number;
  componentRenderTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
}

export function usePerformance(componentName: string) {
  const startTime = useRef(performance.now());
  const metrics = useRef<PerformanceMetrics>({
    pageLoadTime: 0,
    componentRenderTime: 0,
    timeToInteractive: 0,
    firstContentfulPaint: 0,
  });

  useEffect(() => {
    // Measure component render time
    const renderTime = performance.now() - startTime.current;
    metrics.current.componentRenderTime = renderTime;

    // Measure page load performance
    if (typeof window !== 'undefined') {
      // Page load time
      const loadEventEnd = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (loadEventEnd) {
        metrics.current.pageLoadTime = loadEventEnd.loadEventEnd - loadEventEnd.fetchStart;
      }

      // Time to interactive
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            metrics.current.firstContentfulPaint = entry.startTime;
          }
        }
      });

      observer.observe({ entryTypes: ['paint'] });

      // Measure time to interactive (when page becomes responsive)
      let timeToInteractive = 0;
      const checkInteractive = () => {
        if (document.readyState === 'complete') {
          timeToInteractive = performance.now();
          metrics.current.timeToInteractive = timeToInteractive;
        } else {
          setTimeout(checkInteractive, 100);
        }
      };
      checkInteractive();

      // Log performance metrics
      console.log(`Performance metrics for ${componentName}:`, {
        componentRenderTime: `${renderTime.toFixed(2)}ms`,
        pageLoadTime: `${metrics.current.pageLoadTime.toFixed(2)}ms`,
        firstContentfulPaint: `${metrics.current.firstContentfulPaint.toFixed(2)}ms`,
        timeToInteractive: `${metrics.current.timeToInteractive.toFixed(2)}ms`,
      });

      // Send metrics to analytics if available
      if (typeof window.gtag !== 'undefined') {
        window.gtag('event', 'performance_metrics', {
          component_name: componentName,
          component_render_time: renderTime,
          page_load_time: metrics.current.pageLoadTime,
          first_contentful_paint: metrics.current.firstContentfulPaint,
          time_to_interactive: metrics.current.timeToInteractive,
        });
      }
    }

    return () => {
      // Cleanup
      if (typeof window !== 'undefined') {
        // Additional cleanup if needed
      }
    };
  }, [componentName]);

  return metrics.current;
}

// Hook for measuring specific operations
export function useOperationTimer(operationName: string) {
  const startTime = useRef<number | null>(null);

  const startTimer = () => {
    startTime.current = performance.now();
  };

  const endTimer = () => {
    if (startTime.current !== null) {
      const duration = performance.now() - startTime.current;
      console.log(`${operationName} took ${duration.toFixed(2)}ms`);
      
      // Send to analytics if available
      if (typeof window.gtag !== 'undefined') {
        window.gtag('event', 'operation_timing', {
          operation_name: operationName,
          duration: duration,
        });
      }
      
      startTime.current = null;
      return duration;
    }
    return 0;
  };

  return { startTimer, endTimer };
}

// Hook for measuring API response times
export function useAPIPerformance() {
  const measureAPI = async <T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      console.log(`API call to ${endpoint} took ${duration.toFixed(2)}ms`);
      
      // Send to analytics if available
      if (typeof window.gtag !== 'undefined') {
        window.gtag('event', 'api_performance', {
          endpoint: endpoint,
          duration: duration,
          success: true,
        });
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      console.error(`API call to ${endpoint} failed after ${duration.toFixed(2)}ms:`, error);
      
      // Send to analytics if available
      if (typeof window.gtag !== 'undefined') {
        window.gtag('event', 'api_performance', {
          endpoint: endpoint,
          duration: duration,
          success: false,
          error: error.message,
        });
      }
      
      throw error;
    }
  };

  return { measureAPI };
}