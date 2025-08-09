# Strog 🪵

A structured logging library that enables rich runtime metadata tagging using tagged template strings. Strog preserves human readability in development while enabling machine parsing in production.

## Features

- 🏷️ **Tagged Template Strings**: Embed structured metadata using familiar JavaScript syntax
- 👁️ **Human Readable**: Logs remain readable during development
- 🤖 **Machine Parsable**: Extract structured data in production
- 🌐 **Universal**: Works in Node.js, Cloudflare Workers, and browsers  
- 📦 **Zero Dependencies**: Self-contained with no external dependencies
- 🎯 **TypeScript First**: Full TypeScript support with proper type exports
- 🌳 **Tree Shakable**: Import only what you need for optimal bundle size

## Installation

```bash
npm install strog
```

## How It Works

Strog appends structured metadata to your log messages using invisible Unicode characters as delimiters. This approach keeps logs human-readable while making them machine-parsable.

### The Magic: Unicode Delimiters

When you create a structured log, Strog appends metadata after your message using special Unicode characters:

```typescript
const EndpointMetric = StructuredTag('endpoint-metric', ['method', 'endpoint'], false);
const log = EndpointMetric`GET /users`;

// What you see: "GET /users"  
// What's actually there: "GET /users\u2009{\"type\":\"endpoint-metric\",\"metadata\":{\"method\":\"GET\",\"endpoint\":\"/users\"}}"
```

**Two modes:**
- **Development** (`encode: false`): Uses **Thin Space** (`\u2009`) - metadata is visible in console output
- **Production** (`encode: true`): Uses **Zero-Width Space** (`\u200B`) - metadata is hidden from console output, base64 encoded and still available to log processors (tails)

### Log Processing & Tail Workers

The same library can be used in log processors to extract the structured data:

```typescript
// In your log processor (Cloudflare Tail Worker, log aggregator, etc.)
import { parseStructured, parseMeta } from 'strog';

// Parse a log message that came through your system
const incomingLog = "GET /users completed in 150ms\u2009{...metadata...}";

const parsed = parseStructured(incomingLog);
console.log(parsed.raw);     // "GET /users completed in 150ms" (clean message)
console.log(parsed.parsed);  // { type: "endpoint-metric", metadata: {...} }

// Or just get the metadata
const metadata = parseMeta(incomingLog);
if (metadata) {
  // Send to analytics, metrics, alerting, etc.
  analytics.track(metadata.type, metadata.metadata);
}
```

This enables a powerful workflow:
1. **Application code** uses Strog to create structured logs that look normal
2. **Log infrastructure** uses Strog parsing functions to extract rich metadata
3. **Zero configuration** needed - logs flow through existing systems unchanged

## Quick Start

```typescript
import { StructuredTag } from 'strog';

// Create a structured logging tag
const inProdMode = process.env.NODE_ENV === 'production';
const EndpointMetric = StructuredTag(
  'endpoint-metric', 
  ['method', 'endpoint', 'time_ms', 'status_code'], 
  inProdMode
);

// Use it in your logs
const method = "GET";
const endpoint = "/users";  
const time_ms = 150;
const status_code = 200;

const logMessage = EndpointMetric`${method} ${endpoint} time: ${time_ms}ms code: ${status_code}`;
console.info(logMessage);

/* Output in development:
 * GET /users time: 150ms code: 200\u2009{"method":"get","endpoint":"/users","time_ms":150,"status_code":200}
 */

/* Output in production:
 * GET /users/123 time: 150ms code: 200\u200B[hidden-base64-json-metadata]
 * or more simply:
 * GET /users/123 time: 150ms code: 200
```

## API Reference

### `StructuredTag(type, keys, encode?)`

Creates a tagged template function for structured logging.

**Parameters:**
- `type` (string): The type identifier for this log category
- `keys` (string[]): Array of keys corresponding to template placeholders
- `encode` (boolean, optional): Whether to base64 encode metadata. Defaults to `false`

**Returns:** A tagged template function

### `parseStructured(logMessage)`

Parses a structured log message into its components.

**Parameters:**
- `logMessage` (string): The structured log message to parse

**Returns:** `ParsedStructuredLog` object with `raw` and `parsed?` properties

### `parseMeta(logMessage)`

Extracts only the metadata from a structured log message.

**Parameters:**
- `logMessage` (string): The structured log message

**Returns:** `ParsedMetadata` object or `undefined`

### `extractLog(logMessage)`

Extracts only the human-readable message, stripping metadata.

**Parameters:**
- `logMessage` (string): The structured log message

**Returns:** Clean log message string

## Usage Examples

### Basic Logging

```typescript
import { StructuredTag } from 'strog';

const UserAction = StructuredTag('user-action', ['user_id', 'action']);

const userId = 'user123';
const action = 'login';
console.info(UserAction`User ${userId} performed ${action}`);
```

### Error Tracking

```typescript
import { StructuredTag, parseStructured } from 'strog';

const ErrorLog = StructuredTag('error', ['error_code', 'message', 'stack_trace']);

try {
	// some operation
} catch (error) {
	const errorMessage = ErrorLog`Error ${error.code}: ${error.message} ${error.stack}`;
	console.error(errorMessage);
	
	// Send to monitoring service
	const parsed = parseStructured(errorMessage);
	monitoring.track(parsed.parsed?.type, parsed.parsed?.metadata);
}
```

### Performance Monitoring

```typescript
import { StructuredTag } from 'strog';

const PerfMetric = StructuredTag('performance', ['operation', 'duration_ms', 'memory_mb']);

const startTime = performance.now();
const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

// ... perform operation

const duration = performance.now() - startTime;
const memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024 - startMemory;

console.info(PerfMetric`Operation ${'data_processing'} took ${duration}ms using ${memoryUsed}MB`);
```

### Production vs Development

```typescript
import { StructuredTag } from 'strog';

const isProduction = process.env.NODE_ENV === 'production';

// In development: metadata visible as JSON
// In production: metadata base64 encoded and hidden
const ApiCall = StructuredTag('api-call', ['method', 'url', 'status'], isProduction);

const logMessage = ApiCall`${method} ${url} returned ${status}`;
console.info(logMessage);
```

## Metadata Encoding

Strog uses Unicode characters to separate log messages from metadata:

- **Thin Space (\\u2009)**: Visible metadata for development
- **Zero-Width Space (\\u200B)**: Hidden, base64-encoded metadata for production

This approach ensures logs remain readable while enabling automated parsing.

## Framework Integration

### Express.js Middleware

```typescript
import { StructuredTag, parseStructured } from 'strog';

const RequestLog = StructuredTag('http-request', ['method', 'url', 'status', 'duration']);

app.use((req, res, next) => {
	const start = Date.now();
	
	res.on('finish', () => {
		const duration = Date.now() - start;
		const logMessage = RequestLog`${req.method} ${req.url} ${res.statusCode} ${duration}ms`;
		
		console.info(logMessage);
		
		// Send to analytics
		const parsed = parseStructured(logMessage);
		if (parsed.parsed) {
			analytics.track(parsed.parsed.metadata);
		}
	});
	
	next();
});
```

### Cloudflare Workers

```typescript
// Perfect for Cloudflare Workers and parsing in Tail with zero dependencies
import { StructuredTag } from 'strog';

const WorkerLog = StructuredTag('cf-worker', ['method', 'url', 'cf_ray', 'duration'], true);

export default {
	async fetch(request, env, ctx) {
		const start = Date.now();
		try {
			const response = await handleRequest(request);
			const duration = Date.now() - start;
			const {method,url,headers} = request;
			const cf_ray = headers.get('cf-ray');

			console.log(WorkerLog`${method} ${url} ${cf_ray} ${duration}ms`);

			return response;
		} catch (error) {
			console.error(WorkerLog`${request.method} ${request.url} ERROR ${Date.now() - start}ms`);
			throw error;
		}
	}
};
```

## TypeScript Support

Strog is written in TypeScript and provides full type safety:

```typescript
import type { ParsedMetadata, ParsedStructuredLog } from 'strog';

function handleLogMessage(message: string) {
	const parsed: ParsedStructuredLog = parseStructured(message);
	if (parsed.parsed) {
		const metadata: ParsedMetadata = parsed.parsed;
		// TypeScript knows the structure
	}
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.
