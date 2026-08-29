# Contributing to ZeroKey

Thank you for contributing to the **ZeroKey SPIRE / SPIFFE Keyless Identity Platform**! We welcome code contributions, documentation improvements, issue reports, and architectural proposals.

---

## 1. Code of Conduct

Please treat all community members and contributors with respect, professionalism, and kindness. Harassment or discriminatory behavior will not be tolerated.

---

## 2. Getting Started & Local Setup

### Prerequisites
Ensure the following tools are installed on your workstation:
- **Docker Engine** (version 24.0+ recommended) & **Docker Compose v2**
- **Go** (version 1.22+)
- **Make**
- **Git**
- **curl** and **jq**

### Diagnostic Check
Verify your environment prerequisites by running:
```bash
make doctor
```

### Initializing the Workspace
```bash
make init
make up
make bootstrap
make test-flow
```

---

## 3. Branching & Git Conventions

- **Main Branch:** `main` (protected; requires PR approval and passing CI checks).
- **Branch Naming Conventions:**
  - `feat/<feature-name>`: New capabilities or services.
  - `fix/<bug-name>`: Bug fixes and security patches.
  - `refactor/<module-name>`: Code refactoring without behavioral change.
  - `docs/<topic>`: Documentation updates or ADR additions.
  - `ci/<workflow>`: CI/CD workflow and tooling updates.

---

## 4. Commit Message Standards (Conventional Commits)

All commit messages must adhere to the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/) specification:

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

### Allowed Types
- `feat`: A new feature or capability.
- `fix`: A bug fix.
- `docs`: Documentation updates or ADR additions.
- `style`: Formatting changes that do not affect code logic.
- `refactor`: Code restructuring without modifying behavior.
- `test`: Adding or updating test cases.
- `chore`: Tooling, build system, or dependency updates.
- `sec`: Security improvements and vulnerability remediation.

*Example:* `feat(spiffe): implement in-memory SVID rotation metrics`

---

## 5. Development Workflow & Pre-Commit Checks

Before committing and pushing your code:
1. Run all linters and static checks:
   ```bash
   make check
   ```
2. Auto-format Go code and configs:
   ```bash
   make fmt
   ```
3. Execute unit tests with race detection:
   ```bash
   make test
   ```
4. Run integration smoke tests:
   ```bash
   make test-smoke
   ```
5. Perform secret leak scanning:
   ```bash
   make scan
   ```

---

## 6. Architecture Decision Records (ADRs)

If your contribution introduces substantial architectural modifications (e.g., changes to trust domains, alternative workload attestors, new cryptographic algorithms, or major protocol shifts), please submit an ADR under `docs/adr/` following the existing format.

---

## 7. Pull Request Checklist

When opening a Pull Request:
- [ ] Ensure all unit and smoke tests pass locally (`make test && make test-smoke`).
- [ ] Validate that `make check` reports zero linting errors.
- [ ] Verify that no secrets, tokens, or private keys are committed (`make scan`).
- [ ] Add unit test coverage for newly created functions or security logic.
- [ ] Update documentation or ADRs if behavior changes.
