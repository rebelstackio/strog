/**
 * Strog - A structured logging library with tagged template strings
 * 
 * Enables rich runtime metadata tagging while preserving human readability
 * in development and machine parsing in production.
 */

export function buildMetadataRecord(placeholders: any[], keys: string[]): Record<string, any> {
	const result: Record<string, any> = {};
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (key !== undefined) {
			result[key] = placeholders[i];
		}
	}
	return result;
}

export type ParsedMetadata = {
	type: string;
	metadata: Record<string, any> | undefined;
};

export function buildParsedMetadata(type: string, placeholders: any[], keys: string[]): ParsedMetadata {
	const metadata = buildMetadataRecord(placeholders, keys);
	return { type, metadata } as ParsedMetadata;
}

export function buildStringifiedMetadata(type: string, placeholders: any[], keys: string[], encode = false): string {
	const parsed = buildParsedMetadata(type, placeholders, keys);
	const stringified = JSON.stringify(parsed);
	return encode ? `\u200B${btoa(stringified)}` : `\u2009${stringified}`;
}

export function StructuredTag(type: string, keys: string[], encode = false) {
	return function (strings: TemplateStringsArray, ...placeholders: any[]): string {
		const base = String.raw({ raw: strings }, ...placeholders);
		const stringified = buildStringifiedMetadata(type, placeholders, keys, encode);
		return `${base}${stringified}`;
	};
}

// parsing functions
export type ParsedStructuredLog = {
	raw: string;
	parsed?: ParsedMetadata;
};

export function safeJsonParse<T>(json: string): T | void {
	try {
		return JSON.parse(json);
	} catch {}
}

export function parseStructured(structuredLogMessage: string): ParsedStructuredLog {
	let decoded: string | undefined;
	let raw: string;
	
	if (structuredLogMessage.includes('\u200B')) {
		const parts = structuredLogMessage.split('\u200B');
		raw = parts[0] || '';
		const encoded = parts[1];
		try {
			decoded = encoded ? atob(encoded) : undefined;
		} catch {
			decoded = undefined;
		}
	} else if (structuredLogMessage.includes('\u2009')) {
		const parts = structuredLogMessage.split('\u2009');
		raw = parts[0] || '';
		decoded = parts[1];
	} else {
		raw = structuredLogMessage;
	}

	const parsed = decoded ? safeJsonParse<ParsedMetadata>(decoded) : undefined;
	return { raw, parsed } as ParsedStructuredLog;
}

export function parseMeta(structuredLogMessage: string): ParsedMetadata | void {
	return parseStructured(structuredLogMessage).parsed;
}

export function extractLog(structuredLogMessage: string): string {
	return parseStructured(structuredLogMessage).raw;
}
