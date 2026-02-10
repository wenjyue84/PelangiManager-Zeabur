# MCP-Related Skills - Quick Reference

Downloaded MCP and testing-related skills from Anthropic's official skills repository.

## 📦 Installed Skills

### 1. MCP Builder (`mcp-builder/`)
**Purpose:** Guide for creating high-quality MCP (Model Context Protocol) servers

**When to Use:**
- Building new MCP servers to integrate external APIs
- Implementing MCP tools for service integration
- Learning MCP best practices and patterns
- Working with TypeScript SDK or Python SDK

**Key Features:**
- Comprehensive MCP server development guide
- TypeScript and Python implementation patterns
- Best practices for tool design and naming
- Error handling and context management
- Reference documentation and examples

**How to Invoke:**
Simply mention "build an MCP server" or "create MCP tools" in your request to Claude.

**Documentation:**
- Main Guide: `mcp-builder/SKILL.md`
- Best Practices: `mcp-builder/reference/mcp_best_practices.md`
- TypeScript Guide: `mcp-builder/reference/node_mcp_server.md`
- Python Guide: `mcp-builder/reference/python_mcp_server.md`

---

### 2. Web App Testing (`webapp-testing/`)
**Purpose:** Toolkit for testing local web applications using Playwright

**When to Use:**
- Testing frontend functionality
- Debugging UI behavior
- Capturing browser screenshots
- Viewing browser logs
- Automated browser testing

**Key Features:**
- Native Playwright script integration
- Server lifecycle management
- Multi-server support (backend + frontend)
- Screenshot and DOM inspection
- Reconnaissance-then-action pattern

**How to Invoke:**
Mention "test the web app" or "use Playwright to test" in your request.

**Helper Scripts:**
- `scripts/with_server.py` - Manages server lifecycle

**Example Usage:**
```bash
# Single server
python scripts/with_server.py --server "npm run dev" --port 5173 -- python test_script.py

# Multiple servers
python scripts/with_server.py \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python test_script.py
```

**Documentation:**
- Main Guide: `webapp-testing/SKILL.md`

---

### 3. Skill Creator (`skill-creator/`)
**Purpose:** Guide for creating effective custom skills

**When to Use:**
- Creating new skills for specific workflows
- Extending Claude's capabilities
- Building domain-specific knowledge
- Integrating custom tools

**Key Features:**
- Skill creation best practices
- Skill specification format
- Template structure
- Examples and patterns

**How to Invoke:**
Mention "create a new skill" or "build a custom skill" in your request.

**Documentation:**
- Main Guide: `skill-creator/SKILL.md`

---

## 🚀 Quick Start

### Using MCP Builder Skill

**Scenario:** Build a GitHub MCP server

```
User: "I want to build an MCP server for GitHub API integration"

Claude will:
1. Load mcp-builder skill
2. Guide through deep research and planning
3. Help choose TypeScript or Python
4. Generate server structure
5. Implement tools with proper schemas
6. Add error handling and testing
```

### Using Web App Testing Skill

**Scenario:** Test PelangiManager check-in flow

```
User: "Test the check-in flow in PelangiManager using Playwright"

Claude will:
1. Load webapp-testing skill
2. Start dev server (frontend + backend)
3. Write Playwright automation script
4. Navigate through check-in UI
5. Capture screenshots
6. Verify functionality
```

### Using Skill Creator

**Scenario:** Create a custom n8n workflow skill

```
User: "Create a skill for building n8n workflows"

Claude will:
1. Load skill-creator skill
2. Define skill purpose and triggers
3. Structure documentation
4. Add examples and guidelines
5. Create SKILL.md file
```

---

## 🔧 Integration with Tester Agent

The tester agent (`.agents/tester-agent.md`) can leverage these skills:

### Automated Testing Workflow

```bash
# 1. Use webapp-testing skill for UI tests
node scripts/test/test-runner.js e2e

# 2. Tester agent can invoke webapp-testing skill automatically
# When testing UI features, it will:
# - Start servers with with_server.py
# - Run Playwright scripts
# - Capture screenshots
# - Validate behavior
```

### MCP Server Testing

```bash
# Use mcp-builder skill to:
# - Validate MCP server implementation
# - Test tool schemas
# - Check error handling
# - Verify API integration
```

---

## 📚 Additional Resources

### Official Documentation
- **MCP Specification:** https://modelcontextprotocol.io/specification/draft.md
- **TypeScript SDK:** https://github.com/modelcontextprotocol/typescript-sdk
- **Python SDK:** https://github.com/modelcontextprotocol/python-sdk
- **Skills Repository:** https://github.com/anthropics/skills

### Skills Marketplace
- **Claude Skills Library:** https://mcpservers.org/claude-skills
- **Awesome MCP Servers:** https://github.com/punkpeye/awesome-mcp-servers
- **Awesome Claude Skills:** https://github.com/travisvn/awesome-claude-skills

### MCP Servers for PelangiManager

Consider building MCP servers for:
1. **Guest Management MCP** - Integrate guest operations
2. **Capsule Operations MCP** - Manage capsule lifecycle
3. **WhatsApp/Periskope MCP** - Customer communication
4. **Notion MCP** - Task and project tracking
5. **n8n Workflow MCP** - Automation integration

---

## 🎯 Recommended Workflow

### For Developers

1. **Learn MCP Basics**
   - Read `mcp-builder/SKILL.md`
   - Study best practices
   - Review reference docs

2. **Build Your First MCP Server**
   - Use mcp-builder skill with Claude
   - Start with simple API integration
   - Test with MCP Inspector

3. **Test Your Implementation**
   - Use webapp-testing skill
   - Write Playwright tests
   - Capture screenshots

4. **Create Custom Skills**
   - Use skill-creator skill
   - Document your workflows
   - Share with team

### For Tester Agent

When invoked for testing:
1. Check if webapp-testing skill is needed
2. Invoke skill automatically
3. Run Playwright scripts
4. Generate test reports with screenshots

---

## 🔄 Updating Skills

To update skills to the latest version:

```bash
cd C:/Users/Jyue/Desktop/Projects/PelangiManager-Zeabur/skills

# Backup current skills
mkdir -p ../skills-backup
cp -r . ../skills-backup/

# Clone latest from repository
git clone --depth 1 https://github.com/anthropics/skills.git temp
cp -r temp/skills/mcp-builder .
cp -r temp/skills/webapp-testing .
cp -r temp/skills/skill-creator .
rm -rf temp

# Verify skills work
ls -la mcp-builder/
ls -la webapp-testing/
ls -la skill-creator/
```

---

## 💡 Pro Tips

1. **Always read SKILL.md first** - Each skill has comprehensive documentation
2. **Use --help flags** - Helper scripts provide usage info
3. **Combine skills** - Use mcp-builder + webapp-testing for full-stack testing
4. **Create project-specific skills** - Use skill-creator for custom workflows
5. **Keep skills updated** - Check for updates quarterly

---

## 🚨 Troubleshooting

### Skill Not Loading
```
Issue: Claude doesn't recognize the skill
Solution:
- Ensure SKILL.md exists in skill directory
- Check YAML frontmatter is valid
- Verify skill name matches directory name
```

### Playwright Tests Failing
```
Issue: Playwright tests fail to run
Solution:
- Install Playwright: npm install -g playwright
- Install browsers: playwright install chromium
- Check server ports are available
```

### MCP Server Build Errors
```
Issue: MCP server fails to build
Solution:
- Check Node.js/Python version
- Verify dependencies installed
- Review error messages in skill guide
- Check TypeScript/Pydantic schemas
```

---

*Last Updated: 2026-01-29*
*Skills Version: Latest from github.com/anthropics/skills*
