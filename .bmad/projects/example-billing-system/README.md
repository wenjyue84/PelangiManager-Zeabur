# BMAD Example Project: Billing & Invoice System

**Status:** Example Template
**Created:** 2026-01-28
**Estimated Effort:** 2-3 weeks

## Overview

This is an example BMAD project demonstrating how to structure a major feature using the multi-agent approach.

## BMAD Phases

This project follows the 4-phase BMAD workflow:

1. **analysis.md** - Product Manager perspective, requirements definition
2. **planning.md** - Architect perspective, system design
3. **implementation.md** - Developer perspective, code implementation
4. **testing.md** - QA perspective, testing and deployment

## Project Scope

**Goal:** Add complete billing and invoice management to PelangiManager

**Major Components:**
- Database schema for invoices and payments
- Backend API endpoints for billing operations
- Frontend UI for invoice management
- Payment gateway integration (Stripe)

**Out of Scope (for this phase):**
- Recurring billing / subscriptions
- Multi-currency support
- Tax calculation automation

## Quick Start

1. Review `analysis.md` to understand requirements
2. Study `planning.md` for architectural decisions
3. Follow `implementation.md` for step-by-step build process
4. Use `testing.md` for quality assurance and deployment

## Agent Coordination

Throughout this project, different "agent perspectives" are used:

- **Product Manager:** Defines "what" and "why"
- **Architect:** Decides "how" from system design perspective
- **Developer:** Implements "how" in actual code
- **QA:** Validates "works correctly" through testing
- **Scrum Master:** Tracks progress and removes blockers

This multi-perspective approach ensures thorough planning and execution.

## Integration with PelangiManager

This billing system integrates with:
- Guest management (link invoices to guests)
- Check-in/check-out (generate invoices on checkout)
- Settings (configure invoice templates)
- User management (track who created invoices)

## Next Steps

After reviewing this example:
1. Copy this template structure for your own major features
2. Adapt the phases to your specific requirements
3. Use this as reference when building complex features
