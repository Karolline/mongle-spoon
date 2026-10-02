# Dev servers. Usage: `make run back` or `make run front`.
# Recipes avoid shell-specific syntax so they work under both sh and cmd.exe.

.PHONY: run back front

TARGET := $(word 2,$(MAKECMDGOALS))

run:
ifeq ($(TARGET),back)
	cd backend && uv run uvicorn app.main:app --reload
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
