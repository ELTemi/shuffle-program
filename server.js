"use strict";

const http = require("http");
const fs   = require("fs");
const path = require("path");
const url  = require("url");

const { runShuffle } = require("./shuffle");

const PORT       = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE     = 1000;

const MIME_TYPES = {
  ".html": "text/html",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".json": "application/json",
  ".ico":  "image/x-icon",
};

// Holds the most recently shuffled result so paginated GET requests can serve
// slices without re-running the algorithm on every request.
let shuffleState = null;

// Response helpers

function sendJSON(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type":   "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res, statusCode, message) {
  sendJSON(res, statusCode, { error: message });
}

// Static file handler 

function serveStatic(req, res) {
  const filePath = path.join(
    PUBLIC_DIR,
    req.url === "/" ? "index.html" : req.url,
  );

  // Guard against directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendError(res, 403, "Forbidden");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) return sendError(res, 404, "Not found");

    const mimeType = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mimeType });
    res.end(data);
  });
}

// Route handlers 

/**
 * POST /api/shuffle
 *
 * Runs a fresh Fisher-Yates shuffle and caches the result in memory.
 * Returns metadata about the shuffle — not the numbers themselves.
 * Clients should follow up with GET /api/numbers to page through results.
 *
 * Response 200:
 *   { shuffledAt, elapsed, verified, total }
*/
function handleShuffle(req, res) {
  shuffleState = runShuffle();

  const { numbers: _, ...meta } = shuffleState;
  sendJSON(res, 200, meta);
}

/**
 * GET /api/numbers?page=1&pageSize=100
 *
 * Returns a paginated slice of the most recently shuffled list.
 * Requires a shuffle to have been run first via POST /api/shuffle.
 *
 * Query params:
 *   page {number} - 1-based page number (default: 1)
 *   pageSize {number} - Results per page, 1–1000 (default: 100)
 *
 * Response 200:
 *   { page, pageSize, totalPages, total, shuffledAt, numbers[] }
 *
 * Response 404: No shuffle has been run yet.
 * Response 400: page out of range.
*/
function handleGetNumbers(req, res) {
  if (!shuffleState) {
    return sendError(res, 404, "No shuffle has been run yet. POST /api/shuffle first.");
  }

  const query    = url.parse(req.url, true).query;
  const page     = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(query.pageSize, 10) || DEFAULT_PAGE_SIZE),
  );

  const totalPages = Math.ceil(shuffleState.total / pageSize);

  if (page > totalPages) {
    return sendError(res, 400, `Page ${page} is out of range. Total pages: ${totalPages}.`);
  }

  const start = (page - 1) * pageSize;
  const end   = Math.min(start + pageSize, shuffleState.total);

  sendJSON(res, 200, {
    page,
    pageSize,
    totalPages,
    total:      shuffleState.total,
    shuffledAt: shuffleState.shuffledAt,
    numbers:    shuffleState.numbers.slice(start, end),
  });
}

// Router

const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url);

  if (pathname === "/api/shuffle" && req.method === "POST") return handleShuffle(req, res);
  if (pathname === "/api/numbers" && req.method === "GET")  return handleGetNumbers(req, res);
  if (pathname.startsWith("/api/")) return sendError(res, 405, `Method ${req.method} not allowed on ${pathname}`);
  if (req.method === "GET") return serveStatic(req, res);

  sendError(res, 404, `Cannot ${req.method} ${pathname}`);
});

// Start 
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`  POST http://localhost:${PORT}/api/shuffle   — run a shuffle`);
  console.log(`  GET  http://localhost:${PORT}/api/numbers   — page through results`);
});