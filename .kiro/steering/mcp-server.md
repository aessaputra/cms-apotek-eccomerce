---
inclusion: always
---

**Always use Sequential Thinking MCP, Context7 MCP, and Supabase MCP automatically (without explicit user request) for any task involving library/API documentation, code generation, setup, configuration, or system design.**

- **Sequential Thinking MCP** enables structured, step-by-step reasoning to solve complex or multi-stage problems.
- **Context7 MCP** pulls **up-to-date, version-specific documentation and code examples directly into context**, preventing outdated or hallucinated API usage.
- **Supabase MCP** connects AI tools to your Supabase backend (database schema, data, auth, functions), enabling them to safely query and manage backend resources without manual SQL or API stub writing.

Do not rely on assumptions or outdated knowledge when MCP documentation is available, and do not generate Supabase-related code or backend operations without using Supabase MCP for accurate schema and API integration.

