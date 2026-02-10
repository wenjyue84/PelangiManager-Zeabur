# PRD: Zeabur Deployment Logs Viewer

## Overview

Add a deployment monitoring page to PelangiManager that displays Zeabur deployment logs, build status, and error messages. This allows all staff to quickly check if the application deployed successfully and understand why deployments fail.

## Problem Statement

Currently, to check deployment status or investigate why a deployment failed, users must:
1. Log into the Zeabur dashboard
2. Navigate to the correct project/service
3. Find the deployment and scroll through logs

This is time-consuming and requires Zeabur account access. Staff need a quick way to see deployment status directly within PelangiManager.

## Goals

1. **Quick Status Check**: See deployment status (success/failed/building) at a glance
2. **Error Visibility**: Clearly display error messages when deployments fail
3. **Build Logs**: View full build output to debug issues
4. **Runtime Logs**: View application logs for runtime errors
5. **Offline Access**: Cache recent logs locally for reliability
6. **All Users**: Any authenticated user can view deployment status

## Success Metrics

- Staff can check deployment status within 3 seconds
- Error messages are clearly visible and highlighted
- Logs are cached and available even if Zeabur API is slow
- No additional login required (uses stored API token)

## Technical Context

### Zeabur API
- **GraphQL Endpoint**: `https://gateway.zeabur.com/graphql`
- **Authentication**: Bearer token (stored as environment variable)
- **Project ID**: `6948c99fced85978abb44563`
- **Service ID**: `6948cacdaf84400647912aab`

### API Token Storage
- Store `ZEABUR_TOKEN` as environment variable
- Never expose token to frontend
- All API calls go through backend proxy

### Data to Fetch
```graphql
query GetDeployments {
  project(_id: "PROJECT_ID") {
    name
    services {
      name
      status
      deployments(limit: 10) {
        _id
        status
        createdAt
        finishedAt
        errorMessage
      }
    }
  }
}
```

## User Stories

### US-001: Create Zeabur API Service (Backend)
**Priority**: 1
**Description**: Create a backend service to fetch deployment data from Zeabur GraphQL API

**Acceptance Criteria**:
- Create `server/services/zeabur.ts` with ZeaburService class
- Implement `getDeployments()` method to fetch recent deployments
- Implement `getDeploymentLogs(deploymentId)` method
- Handle API errors gracefully (timeout, auth failure)
- Use environment variable `ZEABUR_TOKEN` for authentication
- Add TypeScript types for Zeabur API responses

**Technical Notes**:
- Use native fetch (Node 18+)
- GraphQL queries as template literals
- Return typed response objects
- Cache responses in memory (5 min TTL)

---

### US-002: Create Deployment Status API Endpoint
**Priority**: 2
**Description**: Create REST API endpoint to expose deployment status to frontend

**Acceptance Criteria**:
- Create GET `/api/deployment/status` endpoint
- Returns current deployment status (RUNNING, FAILED, BUILDING, etc.)
- Returns last 5 deployments with basic info
- Returns error message if latest deployment failed
- Endpoint accessible to all authenticated users
- Response includes timestamp for cache validation

**Technical Notes**:
- Add route in `server/routes/` directory
- Follow existing route patterns
- Use ZeaburService from US-001
- Return JSON response with consistent structure

---

### US-003: Create Deployment Logs API Endpoint
**Priority**: 3
**Description**: Create REST API endpoint to fetch detailed logs for a specific deployment

**Acceptance Criteria**:
- Create GET `/api/deployment/logs/:deploymentId` endpoint
- Returns build logs and runtime logs
- Returns error details if deployment failed
- Logs are returned as array of log lines
- Include timestamps for each log entry if available
- Handle case where logs are not available

**Technical Notes**:
- Depends on US-002 (same route file)
- Parse log strings into structured format
- Limit response size (max 1000 lines)

---

### US-004: Create Deployment Status Component
**Priority**: 4
**Description**: Create React component to display deployment status badge

**Acceptance Criteria**:
- Create `DeploymentStatusBadge` component
- Shows status with color coding (green=running, red=failed, yellow=building)
- Shows relative time since last deployment
- Clickable to navigate to full deployment page
- Compact design suitable for header/navbar

**Technical Notes**:
- Place in `client/src/components/deployment/`
- Use existing badge/status patterns from capsule components
- Use TanStack Query for data fetching
- Auto-refresh every 30 seconds

---

### US-005: Create Deployment Logs Page
**Priority**: 5
**Description**: Create full page to display deployment history and logs

**Acceptance Criteria**:
- Create `/deployment` route and page
- Show list of recent deployments (last 10)
- Each deployment shows: status, time, duration
- Click deployment to expand and show logs
- Failed deployments highlighted with error message
- Loading state while fetching data
- Error state if API fails

**Technical Notes**:
- Create `client/src/pages/deployment.tsx`
- Add route in wouter config
- Use accordion/collapsible for log expansion
- Style logs with monospace font

---

### US-006: Add Log Viewer Component with Syntax Highlighting
**Priority**: 6
**Description**: Create component to display logs with proper formatting

**Acceptance Criteria**:
- Create `LogViewer` component
- Display logs in scrollable container
- Monospace font with dark background
- Error lines highlighted in red
- Warning lines highlighted in yellow
- Search/filter functionality within logs
- Copy logs to clipboard button
- Auto-scroll to bottom option

**Technical Notes**:
- Place in `client/src/components/deployment/`
- Use virtual scrolling for performance (react-window already in deps)
- Detect error/warning patterns in log text
- Max height with scroll

---

### US-007: Add Local Cache for Deployment Data
**Priority**: 7
**Description**: Cache deployment data locally for offline access and faster loading

**Acceptance Criteria**:
- Cache deployment status in localStorage
- Cache expires after 5 minutes
- Show cached data while fetching fresh data
- Clear indication when showing cached vs live data
- Cache invalidation on manual refresh

**Technical Notes**:
- Use localStorage with expiry timestamps
- Show "Last updated: X minutes ago" indicator
- Add refresh button to force fetch

---

### US-008: Add Deployment Status to Navigation
**Priority**: 8
**Description**: Add deployment status indicator to the app navigation

**Acceptance Criteria**:
- Add DeploymentStatusBadge to sidebar or header
- Shows current status at all times
- Red dot/indicator if deployment failed
- Clicking navigates to deployment page
- Works on mobile responsive layout

**Technical Notes**:
- Modify existing navigation component
- Position based on existing layout patterns
- Don't obstruct other navigation items

---

## Out of Scope (Future Enhancements)

- Triggering new deployments from the app
- Viewing logs from multiple projects
- Real-time log streaming (WebSocket)
- Email/push notifications for deployment failures
- Deployment rollback functionality

## Technical Implementation Notes

### File Structure
```
server/
  services/
    zeabur.ts          # Zeabur API service
  routes/
    deployment.ts      # Deployment API routes

client/src/
  components/
    deployment/
      DeploymentStatusBadge.tsx
      LogViewer.tsx
      DeploymentCard.tsx
  pages/
    deployment.tsx     # Main deployment page
  hooks/
    useDeployments.ts  # TanStack Query hooks
```

### Environment Variables
```
ZEABUR_TOKEN=sk-xxxxx   # Zeabur API token (required)
```

### Security Considerations
- Token stored server-side only
- All Zeabur API calls proxied through backend
- No sensitive data exposed to frontend
- Standard auth middleware on endpoints

## Testing Strategy

- Unit tests for ZeaburService API methods
- Integration tests for deployment endpoints
- Component tests for UI components
- Manual testing: verify logs display correctly

## Rollback Plan

Feature is additive and isolated. Can be disabled by:
1. Removing navigation link
2. Route returns 404
3. No impact on core functionality
