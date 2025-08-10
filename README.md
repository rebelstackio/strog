# Strog 🪵

A structured logging library that enables rich runtime metadata tagging using tagged template strings. Strog preserves legibility while enabling machinability.

## Features

- 🏷️ **Tagged Template Strings**: Embed structured metadata that maintains types
- 👓 **Human Readable**: Logs remain legible
- 🤖 **Machine Parsable**: Easily extract structured data for log processing
- 🌐 **Universal**: Works in Node.js, Cloudflare Workers, and browsers  
- 📦 **Zero Dependencies**: Self-contained with no external dependencies
- 🎯 **TypeScript First**: Full TypeScript support with proper type exports


## Installation

```bash
npm install strog
```

## Quick Start

```typescript
import { Strog } from 'strog';

// Create a tagged template function
const EndpointMetric = Strog('endpoint-metric', ['method', 'endpoint']);

// Use it like a regular template literal
const method = "GET";
const endpoint = "/users";
const log = EndpointMetric`${method} ${endpoint}`;
// Output: "GET /users⏎{\"type\":\"endpoint-metric\",\"metadata\":{\"method\":\"GET\",\"endpoint\":\"/users\"}}"

// Parse it back
const parsed = EndpointMetric.parse(log);
console.log(parsed.message);     // "GET /users"
console.log(parsed.parsed);  // { type: "endpoint-metric", metadata: { method: "GET", endpoint: "/users" } }
```

## How It Works

Strog appends structured metadata to your log messages using a delimiter, making logs both human-readable and machine-parsable.

### The Magic: Line Separator Delimiter

When you create a structured log, Strog appends metadata after your message using the line separator character (`\u2028`):

```typescript
const EndpointMetric = Strog('endpoint-metric', ['method', 'endpoint']);
const log = EndpointMetric`GET /users`;

// What you see: 
// GET /users⏎{"type":"endpoint-metric","metadata":{"method":"GET","endpoint":"/users"}}
```

The default delimiter (`\u2028`) appears as a subtle space but is extremely unlikely to occur naturally in log messages, making parsing reliable. You can also supply your own delimiter as needed.

### Log Processing & Tail Workers

The same library can be used in log processors to extract the structured data:

```typescript
// In your log processor (Cloudflare Tail Worker, log aggregator, etc.)
import { Strog } from 'strog';

// Parse a log message that came through your system
const incomingLog = "GET /users completed in 150ms\u2028{...metadata...}";
const parsed = Strog.parse(incomingLog);

console.log(parsed.message);     // "GET /users completed in 150ms" 
console.log(parsed.metadata);  // { type: "...", metadata: {...} }
```

This enables a powerful workflow:
1. **Application code** uses Strog to create structured logs that look normal
2. **Log infrastructure** uses Strog parsing functions to extract rich metadata
3. **Zero configuration** needed - logs flow through existing systems unchanged

## API Reference

### `Strog(type, keys, delimiter?)`

Creates a tagged template function for structured logging.

**Parameters:**
- `type` (string): The log entry type/category
- `keys` (string[]): Array of metadata keys that correspond to template placeholders
- `delimiter` (string, optional): Custom delimiter string. Defaults to line separator (`\u2028`)

**Returns:** `StrogTagFunction` - A tagged template function with built-in parsing

```typescript
// Basic usage
const UserAction = Strog('user-action', ['user_id', 'action']);

// With custom delimiter  
const ApiCall = Strog('api', ['method', 'url'], '||LOG||');

// Multi-character delimiters supported
const CustomLog = Strog('custom', ['data'], '===SEPARATOR===');
```

### Static Methods

#### `Strog.metadata(type, placeholders, keys)`

Creates metadata object from template parameters.

**Parameters:**
- `type` (string): The log entry type
- `placeholders` (any[]): Values from template literal
- `keys` (string[]): Metadata keys

**Returns:** `Metadata` object

```typescript
const metadata = Strog.metadata('test', ['value1', 'value2'], ['key1', 'key2']);
// Returns: { type: 'test', metadata: { key1: 'value1', key2: 'value2' } }
```

#### `Strog.parse(message, delimiter?)`

Parses a structured log message back into components.

**Parameters:**
- `message` (string): The structured log message to parse
- `delimiter` (string, optional): The delimiter used. Defaults to line separator (`\u2028`)

**Returns:** `StructuredLog` object with `message` and `parsed?` properties

```typescript
const parsed = Strog.parse(logMessage);
console.log(parsed.message);     // Original message without metadata
console.log(parsed.meta);  // Metadata object or undefined
```

## Examples

### Basic Logging

```typescript
import { Strog } from 'strog';

const UserAction = Strog('user-action', ['user_id', 'action']);

const userId = 'user_123';
const action = 'login';

// Create structured log
const logMessage = UserAction`User ${userId} performed ${action}`;
console.log(logMessage);
// Output: "User user_123 performed login⏎{\"type\":\"user-action\",\"metadata\":{\"user_id\":\"user_123\",\"action\":\"login\"}}"

// Parse it back
const parsed = UserAction.parse(logMessage);
console.log('Raw message:', parsed.raw);
console.log('Metadata:', parsed.meta);
```

### Error Logging

```typescript
const ErrorLog = Strog('error', ['error_code', 'message', 'stack_trace']);

try {
  // Some operation that might fail
  riskyOperation();
} catch (error) {
  const errorCode = 'AUTH_FAILED';
  const message = error.message;
  const stackTrace = error.stack;
  
  console.error(ErrorLog`${errorCode}: ${message}\n${stackTrace}`);
}
```

### Performance Metrics

```typescript
const PerfMetric = Strog('performance', ['operation', 'duration_ms', 'memory_mb']);

const startTime = performance.now();
await someOperation();
const endTime = performance.now();
const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

console.log(PerfMetric`Operation completed: ${operation} took ${endTime - startTime}ms, used ${memoryUsage}MB memory`);
```

### Custom Delimiters

```typescript
// Using a custom delimiter for specific environments
const devLogger = Strog('debug', ['component', 'action'], ' | DEBUG | ');

// Multi-character delimiters
const ApiCall = Strog('api-call', ['method', 'url', 'status'], '||API||');

const logMessage = ApiCall`${method} ${url} returned ${status}`;
// Output: "GET /api/users returned 200||API||{...metadata...}"
```

## Advanced Usage

### Cloudflare Workers

```typescript
// In your Cloudflare Worker
import { Strog } from 'strog';

const RequestLog = Strog('http-request', ['method', 'url', 'status', 'duration']);

export default {
  async fetch(request: Request): Promise<Response> {
    const start = Date.now();
    
    // Process request
    const response = await handleRequest(request);
    
    const duration = Date.now() - start;
    
    // Structured log that appears normal but contains rich metadata
    console.log(RequestLog`${request.method} ${request.url} ${response.status} ${duration}ms`);
    
    return response;
  }
};
```

### Tail Workers (Log Processing)

```typescript
// In your Tail Worker for log processing
import { Strog } from 'strog';

export default {
  async tail(events: TraceItem[]): Promise<void> {
    for (const event of events) {
      if (event.logs) {
        for (const log of event.logs) {
          // Parse structured logs
          const parsed = Strog.parse(log.message);
          
          if (parsed.metadata) {
            // Send structured data to analytics
            await analytics.track({
              type: parsed.metadata.type,
              message: parsed.message,
              metadata: parsed.metadata,
              timestamp: log.timestamp,
            });
          }
        }
      }
    }
  }
};
```

### TypeScript Types

```typescript
import { Strog, type Metadata, type StructuredLog, type StrogTagFunction } from 'strog';

// All types are properly exported
const UserEvent: StrogTagFunction = Strog('user-event', ['user_id', 'event_type']);

// Type-safe parsing
const parsed: StructuredLog = UserEvent.parse(logMessage);
if (parsed.parsed) {
  const metadata: Metadata = parsed.parsed;
  console.log(metadata.type);      // string
  console.log(metadata.metadata);  // Record<string, any> | undefined
}
```

## Best Practices

### 1. Consistent Key Naming
```typescript
// Use consistent, descriptive keys
const ApiMetric = Strog('api-metric', ['method', 'endpoint', 'status_code', 'duration_ms']);
```

### 2. Meaningful Log Types
```typescript
// Use descriptive, hierarchical types
const UserAction = Strog('user-action', ['user_id', 'action']);
const SystemMetric = Strog('system-metric', ['component', 'metric_type', 'value']);
const ErrorEvent = Strog('error-event', ['error_type', 'severity', 'context']);
```

### 3. Environment-Specific Delimiters
```typescript
// Different delimiters for different environments
const delimiter = process.env.NODE_ENV === 'development' ? ' | ' : '\u2028';
const Logger = Strog('app-log', ['level', 'component'], delimiter);
```

### 4. Gradual Adoption
```typescript
// Start with existing logs and gradually add structure
console.log('User login successful'); // Before

const AuthEvent = Strog('auth-event', ['user_id', 'result']);
console.log(AuthEvent`User ${userId} login ${result}`); // After
```

## Error Handling

Strog includes built-in error handling for common issues:

### Empty Delimiters
```typescript
// This will throw an error
try {
  const BadLogger = Strog('test', ['key'], ''); // Error: Delimiter cannot be empty string
} catch (error) {
  console.error(error.message);
}
```

### Malformed JSON
```typescript
// Malformed metadata is safely handled
const malformedLog = 'Hello world\u2028{invalid json}';
const parsed = Strog.parse(malformedLog);

console.log(parsed.message);     // "Hello world"
console.log(parsed.metadata);  // undefined (safe fallback)
```

## Performance

Strog is designed for minimal performance impact:

- **Zero dependencies**: No external library overhead
- **Minimal parsing**: Only parses when explicitly requested
- **String operations**: Uses native JavaScript string methods
- **Tree shakeable**: Import only what you need

## License

MIT License - see LICENSE file for details.
