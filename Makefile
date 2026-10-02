# Dev servers. Usage: `make run back` or `make run front`.
# Recipes avoid shell-specific syntax so they work under both sh and cmd.exe.

.PHONY: run back front

TARGET := $(word 2,$(MAKECMDGOALS))

# Password for adding, editing and deleting recipes. "dev" is a local-only
# default; override with `make run back ADMIN_PASSWORD=...`. Deployments must
# set their own (see README).
ADMIN_PASSWORD ?= dev
export ADMIN_PASSWORD

run:
ifeq ($(TARGET),back)
	cd backend && uv run python -m app.devserver
else ifeq ($(TARGET),front)
	cd frontend && npm run dev
else
	@echo Usage: make run back   or   make run front
	@exit 1
endif

# `back` and `front` are arguments to `run`, not standalone targets.
# `cd .` is a silent no-op in both shells.
back front:
	@cd .
