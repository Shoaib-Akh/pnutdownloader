const fs = require('fs');
const MarkdownIt = require('markdown-it');
const HTMLtoDOCX = require('html-to-docx');

const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
});

(async () => {
    try {
        console.log("Reading markdown file...");
        const markdownStr = fs.readFileSync('/Users/mac/Documents/pnutdownloader/docs/TECHNICAL_DOCUMENTATION_FORMATTED.md', 'utf8');

        console.log("Converting markdown to HTML...");
        const htmlString = md.render(markdownStr);

        console.log("Converting HTML to DOCX...");
        const fileBuffer = await HTMLtoDOCX(htmlString, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            pageNumber: true,
        });

        const outPath = '/Users/mac/Documents/pnutdownloader/docs/TECHNICAL_DOCUMENTATION_FORMATTED.docx';
        fs.writeFileSync(outPath, fileBuffer);

        console.log(`Successfully generated DOCX at ${outPath}`);
    } catch (e) {
        console.error("Error during conversion:", e);
        process.exit(1);
    }
})();
