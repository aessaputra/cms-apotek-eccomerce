---
name: code-review-checklist
description: >-
  Comprehensive checklist for conducting thorough code reviews covering functionality, 
  security, performance, and maintainability. Use when reviewing pull requests or code audits.
---

# Code Review Checklist

Systematic checklist for thorough code reviews ensuring quality, catching bugs, identifying security issues, and maintaining consistency.

## When to Use This Skill

- Reviewing pull requests
- Conducting code audits
- Establishing code review standards
- Training new developers on code review practices
- Ensuring nothing is missed in reviews

---

## Review Process

### Step 1: Understand the Context
Before reviewing code, understand:
- What problem does this code solve?
- What are the requirements?
- What files were changed and why?
- Are there related issues or tickets?
- What's the testing strategy?

### Step 2: Review Functionality
Check if the code works correctly:
- Does it solve the stated problem?
- Are edge cases handled?
- Is error handling appropriate?
- Are there any logical errors?
- Does it match the requirements?

### Step 3: Review Code Quality
Assess code maintainability:
- Is the code readable and clear?
- Are names descriptive?
- Is it properly structured?
- Are functions/methods focused?
- Is there unnecessary complexity?

### Step 4: Review Security
Check for security issues:
- Are inputs validated?
- Is sensitive data protected?
- Are there SQL injection risks?
- Is authentication/authorization correct?
- Are dependencies secure?

### Step 5: Review Performance
Look for performance issues:
- Are there unnecessary loops?
- Is database access optimized?
- Are there memory leaks?
- Is caching used appropriately?
- Are there N+1 query problems?

### Step 6: Review Tests
Verify test coverage:
- Are there tests for new code?
- Do tests cover edge cases?
- Are tests meaningful?
- Do all tests pass?
- Is test coverage adequate?

---

## Best Practices

### ✅ Do This
- **Review Small Changes** - Smaller PRs are easier to review thoroughly
- **Check Tests First** - Verify tests pass and cover new code
- **Run the Code** - Test it locally when possible
- **Ask Questions** - Don't assume, ask for clarification
- **Be Constructive** - Suggest improvements, don't just criticize
- **Focus on Important Issues** - Don't nitpick minor style issues
- **Use Automated Tools** - Linters, formatters, security scanners
- **Review Documentation** - Check if docs are updated
- **Consider Performance** - Think about scale and efficiency
- **Check for Regressions** - Ensure existing functionality still works

### ❌ Don't Do This
- **Don't Approve Without Reading** - Actually review the code
- **Don't Be Vague** - Provide specific feedback with examples
- **Don't Ignore Security** - Security issues are critical
- **Don't Skip Tests** - Untested code will cause problems
- **Don't Be Rude** - Be respectful and professional
- **Don't Rubber Stamp** - Every review should add value

---

## Complete Review Checklist

### Pre-Review
- [ ] Read the PR description and linked issues
- [ ] Understand what problem is being solved
- [ ] Check if tests pass in CI/CD
- [ ] Pull the branch and run it locally

### Functionality
- [ ] Code solves the stated problem
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] User input is validated
- [ ] No logical errors

### Security
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Authentication/authorization is correct
- [ ] Sensitive data is protected
- [ ] No hardcoded secrets

### Performance
- [ ] No unnecessary database queries
- [ ] No N+1 query problems
- [ ] Efficient algorithms used
- [ ] No memory leaks
- [ ] Caching used appropriately

### Code Quality
- [ ] Code is readable and clear
- [ ] Names are descriptive
- [ ] Functions are focused and small
- [ ] No code duplication
- [ ] Follows project conventions

### Tests
- [ ] New code has tests
- [ ] Tests cover edge cases
- [ ] Tests are meaningful
- [ ] All tests pass
- [ ] Test coverage is adequate

### Documentation
- [ ] Code comments explain why, not what
- [ ] API documentation is updated
- [ ] README is updated if needed
- [ ] Breaking changes are documented
- [ ] Migration guide provided if needed

### Git
- [ ] Commit messages are clear
- [ ] No merge conflicts
- [ ] Branch is up to date with main
- [ ] No unnecessary files committed
- [ ] .gitignore is properly configured

---

## Review Comment Templates

### Requesting Changes
```
🔴 **Critical:** [Issue description]
Reason: [Why this is a problem]
Suggestion: [How to fix]
```

### Asking Questions
```
❓ **Question:** [Your question]
Context: [Why you're asking]
```

### Praising Good Code
```
✅ **Good:** [What you liked]
Reason: [Why it's good practice]
```
