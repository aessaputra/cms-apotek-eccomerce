---
name: code-style
description: >-
  Payload CMS coding standards and TypeScript best practices.
  Use when writing collections, hooks, access control, or any Payload CMS code.
---

# Payload CMS Code Style Rules

## Core Principles

* TypeScript-First: Always use TypeScript with proper types from Payload
* Security-Critical: Follow all security patterns, especially access control
* Type Generation: Run `generate:types` script after schema changes
* Transaction Safety: Always pass `req` to nested operations in hooks
* Access Control: Local API bypasses access control by default - use `overrideAccess: false` when passing `user`

## Code Validation

* Run `tsc --noEmit` to validate TypeScript correctness after modifying code
* Run `payload generate:importmap` after creating or modifying components

## Security Patterns

* When passing `user` to Local API, ALWAYS set `overrideAccess: false`
* Always pass `req` to nested operations in hooks for transaction safety
* Use `context` flag to prevent infinite hook loops
* Field-level access only returns boolean (no query constraints)

## Documentation

* Add JSDoc comments to all exported functions and classes
* Document complex access control with inline comments
* Keep collections in separate files
