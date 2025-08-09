/**
 * Test suite for Strog structured logging library
 */

import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import {
	StructuredTag,
	buildMetadataRecord,
	buildParsedMetadata,
	buildStringifiedMetadata,
	parseStructured,
	parseMeta,
	extractLog,
	safeJsonParse,
	type ParsedMetadata,
	type ParsedStructuredLog
} from '../src/index.js';

describe('buildMetadataRecord', () => {
	test('should build metadata record correctly', () => {
		const placeholders = ['GET', '/users/123', 150, 200];
		const keys = ['method', 'endpoint', 'time_ms', 'status_code'];
		const record = buildMetadataRecord(placeholders, keys);
		
		assert.deepEqual(record, {
			method: 'GET',
			endpoint: '/users/123',
			time_ms: 150,
			status_code: 200
		});
	});

	test('should handle more keys than placeholders', () => {
		const placeholders = ['POST', '/api/data'];
		const keys = ['method', 'endpoint', 'time_ms'];
		const record = buildMetadataRecord(placeholders, keys);
		
		assert.deepEqual(record, {
			method: 'POST',
			endpoint: '/api/data',
			time_ms: undefined
		});
	});

	test('should handle more placeholders than keys', () => {
		const placeholders = ['DELETE', '/api/item', 50, 404, 'extra'];
		const keys = ['method', 'endpoint'];
		const record = buildMetadataRecord(placeholders, keys);
		
		assert.deepEqual(record, {
			method: 'DELETE',
			endpoint: '/api/item'
		});
	});
});

describe('buildParsedMetadata', () => {
	test('should build parsed metadata correctly', () => {
		const placeholders = ['GET', '/users/123', 150, 200];
		const keys = ['method', 'endpoint', 'time_ms', 'status_code'];
		const parsed = buildParsedMetadata('endpoint-metric', placeholders, keys);
		
		assert.deepEqual(parsed, {
			type: 'endpoint-metric',
			metadata: {
				method: 'GET',
				endpoint: '/users/123',
				time_ms: 150,
				status_code: 200
			}
		});
	});
});

describe('buildStringifiedMetadata', () => {
	test('should stringify metadata with thin space', () => {
		const stringified = buildStringifiedMetadata('test-type', ['value1', 42], ['key1', 'key2'], false);
		const expectedJson = JSON.stringify({ type: 'test-type', metadata: { key1: 'value1', key2: 42 } });
		
		assert.equal(stringified, `\u2009${expectedJson}`);
	});

	test('should stringify metadata with encoding', () => {
		const stringified = buildStringifiedMetadata('test-type', ['value1'], ['key1'], true);
		const expectedEncoded = btoa(JSON.stringify({ type: 'test-type', metadata: { key1: 'value1' } }));
		
		assert.equal(stringified, `\u200B${expectedEncoded}`);
	});
});

describe('StructuredTag', () => {
	test('should preserve human-readable base message', () => {
		const EndpointMetric = StructuredTag('endpoint-metric', ['method', 'endpoint', 'time_ms', 'status_code'], false);
		const method = 'GET';
		const endpoint = '/users/123';
		const time_ms = 150;
		const status_code = 200;

		const logMessage = EndpointMetric`${method} ${endpoint} time: ${time_ms}ms code: ${status_code}`;
		const expectedBase = 'GET /users/123 time: 150ms code: 200';
		
		assert.ok(logMessage.startsWith(expectedBase));
		assert.ok(logMessage.includes('\u2009'));
	});

	test('should work with encoding', () => {
		const EncodedMetric = StructuredTag('encoded-metric', ['key'], true);
		const encodedMessage = EncodedMetric`Test: ${'test-value'}`;
		
		assert.ok(encodedMessage.startsWith('Test: test-value'));
		assert.ok(encodedMessage.includes('\u200B'));
	});
});

describe('safeJsonParse', () => {
	test('should parse valid JSON', () => {
		const validJson = '{"test": true}';
		const parsed = safeJsonParse(validJson);
		
		assert.deepEqual(parsed, { test: true });
	});

	test('should return undefined for invalid JSON', () => {
		const invalidJson = '{invalid json}';
		const parsed = safeJsonParse(invalidJson);
		
		assert.equal(parsed, undefined);
	});
});

describe('parseStructured', () => {
	test('should extract raw message and parse metadata from thin space format', () => {
		const testMessage = 'Hello world\u2009{"type":"test","metadata":{"key":"value"}}';
		const parsed = parseStructured(testMessage);
		
		assert.equal(parsed.raw, 'Hello world');
		assert.deepEqual(parsed.parsed, { type: 'test', metadata: { key: 'value' } });
	});

	test('should extract raw message and decode metadata from encoded format', () => {
		const testMetadata = { type: 'test', metadata: { key: 'encoded' } };
		const encoded = btoa(JSON.stringify(testMetadata));
		const testMessage = `Hello encoded\u200B${encoded}`;
		const parsed = parseStructured(testMessage);
		
		assert.equal(parsed.raw, 'Hello encoded');
		assert.deepEqual(parsed.parsed, testMetadata);
	});

	test('should handle message without metadata', () => {
		const testMessage = 'Just a regular message';
		const parsed = parseStructured(testMessage);
		
		assert.equal(parsed.raw, 'Just a regular message');
		assert.equal(parsed.parsed, undefined);
	});

	test('should handle malformed encoded data gracefully', () => {
		const malformedEncoded = 'Test\u200Binvalid-base64!';
		const parsed = parseStructured(malformedEncoded);
		
		assert.equal(parsed.raw, 'Test');
		assert.equal(parsed.parsed, undefined);
	});
});

describe('parseMeta', () => {
	test('should extract metadata', () => {
		const testMessage = 'Hello world\u2009{"type":"test","metadata":{"key":"value"}}';
		const meta = parseMeta(testMessage);
		
		assert.deepEqual(meta, { type: 'test', metadata: { key: 'value' } });
	});

	test('should return undefined for no metadata', () => {
		const testMessage = 'Just a regular message';
		const meta = parseMeta(testMessage);
		
		assert.equal(meta, undefined);
	});
});

describe('extractLog', () => {
	test('should extract raw message', () => {
		const testMessage = 'Hello world\u2009{"type":"test","metadata":{"key":"value"}}';
		const log = extractLog(testMessage);
		
		assert.equal(log, 'Hello world');
	});

	test('should handle message without metadata', () => {
		const testMessage = 'Just a regular message';
		const log = extractLog(testMessage);
		
		assert.equal(log, 'Just a regular message');
	});
});

describe('Integration tests', () => {
	test('should work end-to-end', () => {
		const UserAction = StructuredTag('user-action', ['user_id', 'action', 'timestamp'], false);
		const userId = 'user123';
		const action = 'login';
		const timestamp = Date.now();

		const actionLog = UserAction`User ${userId} performed ${action} at ${timestamp}`;
		const parsed = parseStructured(actionLog);

		assert.ok(parsed.raw.includes('User user123 performed login'));
		assert.equal(parsed.parsed?.type, 'user-action');
		assert.equal(parsed.parsed?.metadata?.user_id, 'user123');
		assert.equal(parsed.parsed?.metadata?.action, 'login');
		assert.equal(parsed.parsed?.metadata?.timestamp, timestamp);
	});

	test('should handle empty keys array', () => {
		const EmptyTag = StructuredTag('empty', [], false);
		const emptyMessage = EmptyTag`Just text`;
		const parsed = parseStructured(emptyMessage);
		
		assert.equal(parsed.raw, 'Just text');
		assert.deepEqual(parsed.parsed?.metadata, {});
	});
});
