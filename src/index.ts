/**
 * Strog - A structured logging library with tagged template strings
 * 
 * Enables rich runtime metadata tagging while preserving human readability
 * in development and machine parsing in production.
 */

export type Metadata = {
	type: string,
	metadata: Record<string, any> | undefined,
};

export type StructuredLog = {
	message: string,
	metadata?: Metadata,
};

export type StrogTagFunction = {
	(strings: TemplateStringsArray, ...placeholders: any[]): string,
};

function buildMetadataRecord(placeholders: any[], keys: string[]): Record<string, any> {
	const result: Record<string, any> = {};
	for ( let i = 0; i < keys.length; i++ ) {
		const key = keys[i];
		if (key !== undefined) result[key] = placeholders[i];
	}
	return result;
}

function safeJsonParse<T>(json: string): T | void {
	try {
		return JSON.parse(json);
	} catch {}
}

export function Strog ( type: string, keys: string[], delimiter: string = '\u2028' ) : StrogTagFunction {
	if (delimiter === '') throw new Error('Delimiter cannot be empty string.');
	const tagFunction = (strings: TemplateStringsArray, ...placeholders: any[] ) : string => {
		const base = String.raw ( { raw: strings }, ...placeholders );
		const metadata = Strog.metadata ( type, placeholders, keys );
		return `${base}${delimiter}${JSON.stringify(metadata)}`;
	};
	return tagFunction as StrogTagFunction;
}

Strog.metadata = function ( type: string, placeholders: any[], keys: string[] ) : Metadata {
	const metadata = buildMetadataRecord ( placeholders, keys );
	return { type, metadata } as Metadata;
}

Strog.parse = function ( structuredLogMessage: string, delimiter = '\u2028' ) : StructuredLog {
	if (delimiter === '') throw new Error('Delimiter cannot be empty string.');
	const delimiterIndex = structuredLogMessage.lastIndexOf(delimiter);
	if (delimiterIndex === -1) return { message: structuredLogMessage } as StructuredLog;
	const message = structuredLogMessage.slice ( 0, delimiterIndex );
	const metadatajson = structuredLogMessage.slice ( delimiterIndex + delimiter.length );
	const metadata = metadatajson ? safeJsonParse<Metadata> ( metadatajson ) : undefined;
	return { message, metadata } as StructuredLog;
};
