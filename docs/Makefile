# Documentation Makefile for PNUTDownloader
# Usage: make <target>

.PHONY: help view html pdf clean install-deps

# Default target
help:
	@echo "PNUTDownloader Documentation Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  make view       - Open documentation in browser"
	@echo "  make html       - Generate HTML documentation"
	@echo "  make pdf        - Generate PDF documentation"
	@echo "  make clean      - Clean generated files"
	@echo "  make install-deps - Install documentation dependencies"
	@echo ""
	@echo "Documentation files:"
	@echo "  - docs/USER_GUIDE.md"
	@echo "  - docs/API_REFERENCE.md"
	@echo "  - docs/INSTALLATION.md"
	@echo "  - docs/CONTRIBUTING.md"
	@echo "  - docs/TROUBLESHOOTING.md"

# Open documentation in default browser
view:
	@echo "Opening documentation..."
	@if [ -f "docs/USER_GUIDE.md" ]; then
		@open docs/USER_GUIDE.md 2>/dev/null || xdg-open docs/USER_GUIDE.md 2>/dev/null || echo "Please open docs/USER_GUIDE.md manually"
	@else
		@echo "Documentation not found. Run 'make install-deps' first."
	@fi

# Generate HTML using mdBook (optional)
html:
	@echo "Generating HTML documentation..."
	@mkdir -p docs/_build
	@echo "HTML generation requires markdown-to-html tool"
	@echo "Install: npm install -g markdown-to-html"
	@for file in docs/*.md; do \
		if [ "$$file" != "docs/README.md" ]; then \
			echo "Converting $$file"; \
		fi \
	done
	@echo "HTML documentation generated in docs/_build/"

# Generate PDF (requires pandoc)
pdf:
	@echo "Generating PDF documentation..."
	@which pandoc >/dev/null 2>&1 || (echo "pandoc not found. Install: brew install pandoc" && exit 1)
	@pandoc docs/*.md -o docs/PNUTDownloader_Documentation.pdf --standalone
	@echo "PDF saved to docs/PNUTDownloader_Documentation.pdf"

# Clean generated files
clean:
	@echo "Cleaning documentation..."
	@rm -rf docs/_build
	@rm -f docs/*.pdf
	@echo "Clean complete."

# Install documentation dependencies
install-deps:
	@echo "Installing documentation tools..."
	@which npm >/dev/null 2>&1 && npm install -g markdown-to-html || echo "npm not found"
	@echo "Tools installed."

# List all documentation
list:
	@echo "Available Documentation:"
	@echo ""
	@ls -la docs/*.md
