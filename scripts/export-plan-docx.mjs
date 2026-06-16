/**
 * Converts API_INTEGRATION_PLAN.md → API_INTEGRATION_PLAN.docx
 * Run: node scripts/export-plan-docx.mjs
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ShadingType,
  convertInchesToTwip,
} from 'docx';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MD_PATH = join(ROOT, 'API_INTEGRATION_PLAN.md');
const OUT_PATH = join(ROOT, 'API_INTEGRATION_PLAN.docx');

const md = readFileSync(MD_PATH, 'utf8');
const lines = md.split('\n');

// ── Colour palette ──────────────────────────────────────────────────────────
const COLORS = {
  heading1Bg: '1F3864',   // dark navy
  heading2Bg: '2E75B6',   // mid blue
  heading3Bg: 'BDD7EE',   // light blue
  codeBg:     'F2F2F2',   // light grey
  tableHead:  '2E75B6',   // mid blue
  tableAlt:   'EBF3FB',   // very light blue
  white:      'FFFFFF',
  black:      '000000',
  codeText:   '24292E',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function bold(text) {
  return new TextRun({ text, bold: true });
}

function code(text) {
  return new TextRun({
    text,
    font: 'Courier New',
    size: 18,
    color: COLORS.codeText,
  });
}

function inlineText(raw) {
  // Parse inline bold (**text**) and inline code (`text`)
  const runs = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: raw.slice(last, m.index) }));
    const token = m[0];
    if (token.startsWith('`')) {
      runs.push(new TextRun({ text: token.slice(1, -1), font: 'Courier New', size: 18, color: COLORS.codeText }));
    } else {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
    }
    last = m.index + token.length;
  }
  if (last < raw.length) runs.push(new TextRun({ text: raw.slice(last) }));
  return runs;
}

function heading1(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: COLORS.white, size: 32 })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    shading: { type: ShadingType.SOLID, color: COLORS.heading1Bg },
    indent: { left: convertInchesToTwip(0.1) },
  });
}

function heading2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: COLORS.white, size: 26 })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160 },
    shading: { type: ShadingType.SOLID, color: COLORS.heading2Bg },
    indent: { left: convertInchesToTwip(0.1) },
  });
}

function heading3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: COLORS.black, size: 22 })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 280, after: 120 },
    shading: { type: ShadingType.SOLID, color: COLORS.heading3Bg },
    indent: { left: convertInchesToTwip(0.1) },
  });
}

function bodyPara(rawText, indent = 0) {
  return new Paragraph({
    children: inlineText(rawText),
    spacing: { after: 100 },
    indent: indent ? { left: convertInchesToTwip(indent) } : undefined,
  });
}

function bulletPara(rawText, level = 0) {
  return new Paragraph({
    children: inlineText(rawText),
    bullet: { level },
    spacing: { after: 80 },
    indent: { left: convertInchesToTwip(0.25 * (level + 1)) },
  });
}

function codeBlock(lines) {
  return lines.map((line) =>
    new Paragraph({
      children: [code(line === '' ? ' ' : line)],
      shading: { type: ShadingType.SOLID, color: COLORS.codeBg },
      spacing: { after: 0, before: 0, line: 240 },
      indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
    })
  );
}

function hrPara() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.heading2Bg } },
    spacing: { before: 200, after: 200 },
    children: [],
  });
}

// Build a markdown table → docx Table
function buildTable(headerRow, bodyRows) {
  const allRows = [headerRow, ...bodyRows];
  const colCount = headerRow.length;
  const colWidth = Math.floor(9000 / colCount);

  return new Table({
    width: { size: 8784, type: WidthType.DXA },
    rows: allRows.map((cells, rowIdx) =>
      new TableRow({
        children: cells.map((cellText) =>
          new TableCell({
            children: [
              new Paragraph({
                children: inlineText(cellText.trim()),
                spacing: { before: 60, after: 60 },
              }),
            ],
            width: { size: colWidth, type: WidthType.DXA },
            shading: rowIdx === 0
              ? { type: ShadingType.SOLID, color: COLORS.tableHead }
              : rowIdx % 2 === 0
              ? { type: ShadingType.SOLID, color: COLORS.tableAlt }
              : { type: ShadingType.CLEAR, color: COLORS.white },
            margins: {
              top: 80, bottom: 80, left: 120, right: 120,
            },
          })
        ),
      })
    ),
    borders: {
      top:          { style: BorderStyle.SINGLE, size: 4, color: COLORS.heading2Bg },
      bottom:       { style: BorderStyle.SINGLE, size: 4, color: COLORS.heading2Bg },
      left:         { style: BorderStyle.SINGLE, size: 4, color: COLORS.heading2Bg },
      right:        { style: BorderStyle.SINGLE, size: 4, color: COLORS.heading2Bg },
      insideH:      { style: BorderStyle.SINGLE, size: 2, color: 'BBBBBB' },
      insideV:      { style: BorderStyle.SINGLE, size: 2, color: 'BBBBBB' },
    },
  });
}

// ── Parser ──────────────────────────────────────────────────────────────────

const children = [];
let i = 0;

function stripInlineFormatting(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

while (i < lines.length) {
  const line = lines[i];

  // Heading 1
  if (/^# /.test(line)) {
    children.push(heading1(line.replace(/^# /, '')));
    i++;
    continue;
  }

  // Heading 2
  if (/^## /.test(line)) {
    children.push(heading2(line.replace(/^## /, '')));
    i++;
    continue;
  }

  // Heading 3
  if (/^### /.test(line)) {
    children.push(heading3(line.replace(/^### /, '')));
    i++;
    continue;
  }

  // Horizontal rule
  if (/^---+$/.test(line.trim())) {
    children.push(hrPara());
    i++;
    continue;
  }

  // Fenced code block
  if (/^```/.test(line)) {
    const codeLines = [];
    i++;
    while (i < lines.length && !/^```/.test(lines[i])) {
      codeLines.push(lines[i]);
      i++;
    }
    i++; // skip closing ```
    children.push(...codeBlock(codeLines));
    children.push(new Paragraph({ children: [], spacing: { after: 120 } }));
    continue;
  }

  // Markdown table
  if (/^\|/.test(line)) {
    const tableLines = [];
    while (i < lines.length && /^\|/.test(lines[i])) {
      tableLines.push(lines[i]);
      i++;
    }
    // filter out separator rows (---|---)
    const dataRows = tableLines.filter((l) => !/^\|[-: |]+\|$/.test(l.trim()));
    if (dataRows.length >= 2) {
      const parseRow = (l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const [header, ...body] = dataRows.map(parseRow);
      children.push(buildTable(header, body));
      children.push(new Paragraph({ children: [], spacing: { after: 160 } }));
    }
    continue;
  }

  // Bullet list
  if (/^[-*] /.test(line)) {
    children.push(bulletPara(line.replace(/^[-*] /, ''), 0));
    i++;
    continue;
  }

  // Numbered list
  if (/^\d+\. /.test(line)) {
    children.push(bulletPara(line.replace(/^\d+\. /, ''), 0));
    i++;
    continue;
  }

  // Blank line
  if (line.trim() === '') {
    i++;
    continue;
  }

  // Regular paragraph
  children.push(bodyPara(line));
  i++;
}

// ── Assemble document ───────────────────────────────────────────────────────

const doc = new Document({
  creator: 'TenantInc Widgets Team',
  title: 'Space Widget — API Integration Plan',
  description: 'Full implementation plan for wiring widget-space-list to the Hummingbird API',
  styles: {
    paragraphStyles: [
      {
        id: 'Normal',
        name: 'Normal',
        run: { font: 'Calibri', size: 22 },
        paragraph: { spacing: { line: 276 } },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left:   convertInchesToTwip(1.2),
            right:  convertInchesToTwip(1.2),
          },
        },
      },
      children,
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUT_PATH, buffer);
console.log(`✓ Exported → ${OUT_PATH}`);
