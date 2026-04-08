#!/usr/bin/env node
/**
 * Browser control MCP for testing the Presentation Coach app.
 * Exposes Playwright-based tools: navigate, screenshot, click, evaluate, console logs.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { chromium } from 'playwright'

// ── State ───────────────────────────────────────────────────────────────────
let browser = null
let context = null
let page    = null
const consoleLogs = []   // rolling buffer of console messages

// ── Launch / reuse browser ───────────────────────────────────────────────────
async function ensureBrowser() {
  if (browser && page) return page
  browser = await chromium.launch({
    headless: false,                   // visible so you can watch what happens
    args: [
      '--use-fake-ui-for-media-stream',  // auto-grant camera/mic in UI
      '--use-fake-device-for-media-stream', // synthetic video/audio frames
      '--allow-file-access-from-files',
    ],
  })
  context = await browser.newContext({
    permissions: ['camera', 'microphone'],
    viewport: { width: 1280, height: 800 },
  })
  page = await context.newPage()
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text(), time: new Date().toISOString() })
    if (consoleLogs.length > 300) consoleLogs.shift()
  })
  page.on('pageerror', err => {
    consoleLogs.push({ type: 'pageerror', text: err.message, time: new Date().toISOString() })
  })
  return page
}

// ── MCP Server ───────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'browser-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'navigate',
      description: 'Navigate the browser to a URL',
      inputSchema: {
        type: 'object',
        properties: { url: { type: 'string', description: 'URL to navigate to' } },
        required: ['url'],
      },
    },
    {
      name: 'screenshot',
      description: 'Take a screenshot of the current page and save to a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to save the PNG (e.g. /tmp/shot.png)' },
          fullPage: { type: 'boolean', description: 'Capture full scrollable page (default false)' },
        },
        required: ['path'],
      },
    },
    {
      name: 'click',
      description: 'Click an element matching a CSS selector or text',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector, role, or text to click' },
        },
        required: ['selector'],
      },
    },
    {
      name: 'fill',
      description: 'Type text into an input field',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['selector', 'value'],
      },
    },
    {
      name: 'evaluate',
      description: 'Run JavaScript in the page context and return the result',
      inputSchema: {
        type: 'object',
        properties: { code: { type: 'string', description: 'JS expression to evaluate' } },
        required: ['code'],
      },
    },
    {
      name: 'get_console',
      description: 'Return recent browser console logs (errors, warnings, info)',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Filter by type: error | warning | log | pageerror (omit for all)' },
          last: { type: 'number', description: 'Return last N entries (default 50)' },
        },
      },
    },
    {
      name: 'wait',
      description: 'Wait for a selector to appear or a fixed number of milliseconds',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector to wait for (optional)' },
          ms: { type: 'number', description: 'Milliseconds to wait (used if no selector)' },
        },
      },
    },
    {
      name: 'get_text',
      description: 'Get the inner text of an element',
      inputSchema: {
        type: 'object',
        properties: { selector: { type: 'string' } },
        required: ['selector'],
      },
    },
    {
      name: 'close_browser',
      description: 'Close the browser and clean up',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    if (name === 'close_browser') {
      if (browser) { await browser.close(); browser = null; context = null; page = null }
      return { content: [{ type: 'text', text: 'Browser closed.' }] }
    }

    const pg = await ensureBrowser()

    if (name === 'navigate') {
      await pg.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      const title = await pg.title()
      return { content: [{ type: 'text', text: `Navigated to ${args.url} — title: "${title}"` }] }
    }

    if (name === 'screenshot') {
      await pg.screenshot({ path: args.path, fullPage: args.fullPage ?? false })
      return { content: [{ type: 'text', text: `Screenshot saved to ${args.path}` }] }
    }

    if (name === 'click') {
      await pg.click(args.selector, { timeout: 10000 })
      return { content: [{ type: 'text', text: `Clicked: ${args.selector}` }] }
    }

    if (name === 'fill') {
      await pg.fill(args.selector, args.value)
      return { content: [{ type: 'text', text: `Filled "${args.selector}" with value.` }] }
    }

    if (name === 'evaluate') {
      const result = await pg.evaluate(args.code)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }

    if (name === 'get_console') {
      const last = args.last ?? 50
      let logs = consoleLogs
      if (args.type) logs = logs.filter(l => l.type === args.type)
      const slice = logs.slice(-last)
      return { content: [{ type: 'text', text: JSON.stringify(slice, null, 2) }] }
    }

    if (name === 'wait') {
      if (args.selector) {
        await pg.waitForSelector(args.selector, { timeout: 30000 })
        return { content: [{ type: 'text', text: `Element "${args.selector}" appeared.` }] }
      } else {
        await pg.waitForTimeout(args.ms ?? 1000)
        return { content: [{ type: 'text', text: `Waited ${args.ms ?? 1000}ms.` }] }
      }
    }

    if (name === 'get_text') {
      const el = await pg.$(args.selector)
      if (!el) return { content: [{ type: 'text', text: `Element not found: ${args.selector}` }] }
      const text = await el.innerText()
      return { content: [{ type: 'text', text }] }
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true }
  }
})

// ── Start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport()
await server.connect(transport)
