# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security

## [0.1.0] - 2025-08-09

### Added
- Initial release of Strog structured logging library
- Tagged template strings for structured metadata
- Support for Node.js, browsers, and Cloudflare Workers
- Unicode-based metadata encoding (visible and hidden modes)
- Comprehensive TypeScript support
- Zero dependencies implementation
- Full test suite with Node.js test runner

### Features
- `StructuredTag()` - Create tagged template functions
- `parseStructured()` - Parse structured log messages
- `parseMeta()` - Extract metadata only
- `extractLog()` - Extract clean log message
- `buildMetadataRecord()` - Build metadata objects
- `safeJsonParse()` - Safe JSON parsing utility

[Unreleased]: https://github.com/username/strog/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/username/strog/releases/tag/v0.1.0
