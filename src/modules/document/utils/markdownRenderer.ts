import { Logger } from '../../../utils/logger.js';

export enum BlockType {
  PAGE = 1, TEXT = 2,
  H1 = 3, H2 = 4, H3 = 5, H4 = 6, H5 = 7, H6 = 8, H7 = 9, H8 = 10, H9 = 11,
  BULLET = 12, ORDERED = 13, CODE = 14, QUOTE = 15, DIVIDER = 16,
  QUOTE_CONTAINER = 17, BITABLE = 18, DIAGRAM = 21, JAVA_CODE = 22, QUOTE_ALT = 23,
  IMAGE = 27, MINDNOTE = 29, SHEET = 30, TABLE = 31, TABLE_CELL = 32, GRID = 33, GRID_COL = 34,
  ADD_ON = 40, WHITEBOARD = 43
}

export interface FeishuBlock {
  block_id: string;
  parent_id: string;
  children?: string[];
  block_type: number;
  text?: any;
  heading1?: any; heading2?: any; heading3?: any; heading4?: any;
  heading5?: any; heading6?: any; heading7?: any; heading8?: any; heading9?: any;
  bullet?: any; ordered?: any; todo?: any; quote?: any;
  page?: any; table?: any; image?: any; code?: any; grid?: any; grid_col?: any;
  table_cell?: any; sheet?: any; bitable?: any; whiteboard?: any; board?: any; add_on?: any; mindnote?: any; diagram?: any;
  [key: string]: any; // Allow extensibility but discourage usage
}

export interface RenderResult {
  doc_id: string;
  title: string;
  markdown: string;
  length: number;
}

export class BlockRenderer {
  private blockMap: Map<string, FeishuBlock> = new Map();
  private docId: string = '';
  private title: string = '';
  private readonly maxDepth: number = 50;
  private currentLength: number = 0;
  private readonly maxLength: number = 200000;

  constructor(blocks: FeishuBlock[]) {
    for (const block of blocks) {
      if (!block.block_id) continue;
      this.blockMap.set(block.block_id, block);

      if (block.block_type === BlockType.PAGE) {
        this.docId = block.block_id;
        this.title = this.extractPageTitle(block);
      }
    }

    if (!this.docId && blocks.length > 0) {
      const rootBlock = blocks.find((b) => !b.parent_id) || blocks[0];
      this.docId = rootBlock.block_id;
      this.title = this.extractPageTitle(rootBlock);
    }
  }

  public render(): RenderResult {
    const root = this.blockMap.get(this.docId);
    if (!root) {
      return { doc_id: '', title: '', markdown: '', length: 0 };
    }

    const children = root.children || [];
    const visited = new Set<string>();
    visited.add(this.docId);
    this.currentLength = 0;
    
    // Pass shared Set to prevent cyclical structure stack overflows
    let markdown = this.renderChildren(children, 0, visited);

    if (this.currentLength > this.maxLength) {
      markdown += `\n\n... [CONTENT TRUNCATED FOR SAFETY OOM PREVENTED > ${this.maxLength} chars] ...`;
    }

    return {
      doc_id: this.docId,
      title: this.title,
      markdown: markdown,
      length: markdown.length,
    };
  }

  private renderChildren(childIds: string[], depth: number, visited: Set<string>): string {
    const parts: string[] = [];
    for (const cid of childIds) {
      if (this.currentLength > this.maxLength) break;
      
      if (visited.has(cid)) {
        Logger.warn(`Cycle detected in block structure or multi-parent DAG: ${cid}`);
        continue;
      }
      visited.add(cid);

      const block = this.blockMap.get(cid);
      if (!block) continue;

      const rendered = this.renderBlock(block, depth, visited);
      if (rendered !== null && rendered !== undefined) {
        parts.push(rendered);
      }
      // Note: We deliberately do NOT `visited.delete(cid)` here for strict DAG acyclic safety. 
      // Feishu docs should strictly be trees.
    }
    return parts.join('\n');
  }

  private renderBlock(block: FeishuBlock, depth: number, visited: Set<string>): string | null {
    if (this.currentLength > this.maxLength) return null;

    if (depth > this.maxDepth) {
      Logger.warn(`Max depth exceeded at block: ${block.block_id}`);
      return `<!-- max depth exceeded -->`;
    }

    const bt = block.block_type;

    if (bt === BlockType.PAGE) {
      return this.renderChildren(block.children || [], depth, visited);
    }

    if (bt >= BlockType.H1 && bt <= BlockType.H9) {
      const level = bt - 2;
      return `${'#'.repeat(level)} ${this.extractText(block)}`;
    }

    if (bt === BlockType.TEXT) {
      const text = this.extractText(block);
      const children = block.children || [];
      if (children.length > 0) {
        const childText = this.renderChildren(children, depth + 1, visited);
        return text ? `${text}\n${childText}` : childText;
      }
      return text;
    }

    if (bt === BlockType.BULLET) {
      const indent = '  '.repeat(depth);
      const parts = [`${indent}- ${this.extractText(block)}`];
      const children = block.children || [];
      if (children.length > 0) {
        parts.push(this.renderChildren(children, depth + 1, visited));
      }
      return parts.join('\n');
    }

    if (bt === BlockType.ORDERED) {
      if (block.table) return this.renderTable(block, visited);
      const indent = '  '.repeat(depth);
      const parts = [`${indent}1. ${this.extractText(block)}`];
      const children = block.children || [];
      if (children.length > 0) {
        parts.push(this.renderChildren(children, depth + 1, visited));
      }
      return parts.join('\n');
    }

    if (bt === BlockType.TABLE || block.table) {
      return this.renderTable(block, visited);
    }

    if (bt === BlockType.IMAGE || block.image) {
      return this.renderImage(block);
    }

    if (bt === BlockType.CODE || bt === BlockType.JAVA_CODE || block.code) {
      return this.renderCode(block);
    }

    if (bt === BlockType.QUOTE || bt === BlockType.QUOTE_CONTAINER || bt === BlockType.QUOTE_ALT || block.quote) {
      const text = this.extractText(block);
      const children = block.children || [];
      if (children.length > 0) {
        const childText = this.renderChildren(children, depth, visited);
        const lines = childText.split('\n');
        return lines.map((line) => `> ${line}`).join('\n');
      }
      return `> ${text}`;
    }

    if (bt === BlockType.DIVIDER) {
      return '---';
    }

    if (bt === BlockType.GRID || bt === BlockType.GRID_COL || block.grid || block.grid_col) {
      return this.renderChildren(block.children || [], depth, visited);
    }

    if (bt === BlockType.TABLE_CELL || block.table_cell) {
      return null;
    }

    if (bt === BlockType.SHEET || block.sheet) {
      const token = block.sheet?.token || '';
      return `<sheet token="${token}"/>`;
    }
    if (bt === BlockType.BITABLE || block.bitable) {
      const token = block.bitable?.token || '';
      return `<bitable token="${token}"/>`;
    }
    if (bt === BlockType.WHITEBOARD || block.board || block.whiteboard) {
      const token = block.board?.token || block.whiteboard?.token || '';
      return `<whiteboard token="${token}"/>`;
    }
    if (bt === BlockType.MINDNOTE || block.mindnote) {
      const token = block.mindnote?.token || '';
      return `<mindnote token="${token}"/>`;
    }
    if (bt === BlockType.DIAGRAM || block.diagram) {
      const diagramType = block.diagram?.diagram_type === 2 ? 'uml' : 'flowchart';
      return `<diagram type="${diagramType}"/>`;
    }

    if (bt === BlockType.ADD_ON || block.add_on) {
      const children = block.children || [];
      if (children.length > 0) return this.renderChildren(children, depth, visited);
      return `<!-- add-on block type ${bt} -->`;
    }

    const children = block.children || [];
    if (children.length > 0) {
      Logger.warn(`Unrecognized block_type: ${bt}, falling back to children rendering`);
      return this.renderChildren(children, depth, visited);
    }

    const text = this.extractText(block);
    if (text) return text;

    Logger.warn(`Totally unknown block_type: ${bt}`);
    return `<!-- unknown block [type: ${bt}] -->`;
  }

  private renderTable(block: FeishuBlock, visited: Set<string>): string {
    const tableInfo = block.table || {};
    const prop = tableInfo.property || tableInfo || {};
    const rowSize = prop.row_size || tableInfo.row_size || 0;
    const colSize = prop.column_size || tableInfo.column_size || 0;
    const headerRow = prop.header_row_index ?? -1;
    const columnWidths = prop.column_width || [];

    let attrs = `rows="${rowSize}" cols="${colSize}"`;
    if (headerRow === 0) attrs += ' header-row="true"';
    if (columnWidths && columnWidths.length > 0) attrs += ` column-widths="${columnWidths.join(',')}"`;

    const lines: string[] = [`<lark-table ${attrs}>`, ''];
    const children = block.children || [];
    const cellsPerRow = colSize > 0 ? colSize : 1;

    for (let r = 0; r < rowSize; r++) {
      lines.push('  <lark-tr>');
      for (let c = 0; c < cellsPerRow; c++) {
        const cellIdx = r * cellsPerRow + c;
        lines.push('    <lark-td>');
        if (cellIdx < children.length) {
          const cellId = children[cellIdx];
          const cellContent = this.renderCell(cellId, visited);
          if (cellContent) lines.push(`      ${cellContent}`);
        }
        lines.push('    </lark-td>');
      }
      lines.push('  </lark-tr>');
    }

    lines.push('</lark-table>');
    return lines.join('\n');
  }

  private renderCell(cellId: string, visited: Set<string>): string {
    // Unlike standard markdown, we use <lark-td> so we can perfectly support multiline & deep nested blocks in cells
    if (visited.has(cellId)) return '';
    visited.add(cellId);

    const cellBlock = this.blockMap.get(cellId);
    if (!cellBlock) return '';

    const children = cellBlock.children || [];
    if (children.length === 0) {
      return this.extractText(cellBlock);
    }

    return this.renderChildren(children, 0, visited);
  }

  private renderImage(block: FeishuBlock): string {
    const img = block.image || {};
    const token = img.token || '';
    const width = img.width || '';
    const height = img.height || '';
    let align = img.align || 'center';

    const alignMap: Record<number, string> = { 1: 'center', 2: 'left', 3: 'right' };
    if (typeof align === 'number') {
      align = alignMap[align] || 'center';
    }

    let attrs = `token="${token}"`;
    if (width) attrs += ` width="${width}"`;
    if (height) attrs += ` height="${height}"`;
    if (align) attrs += ` align="${align}"`;

    return `<image ${attrs}/>`;
  }

  private renderCode(block: FeishuBlock): string {
    const codeInfo = block.code || {};
    const body = codeInfo.body || {};
    const elements = body.elements || [];
    const language = codeInfo.language || '';

    const codeText = this.elementsToText(elements);

    const langMap: Record<number, string> = {
      1: 'plaintext', 2: 'abap', 3: 'ada', 4: 'apache', 5: 'apex', 6: 'assembly',
      22: 'java', 49: 'python', 55: 'shell', 59: 'sql', 63: 'typescript',
      64: 'xml', 65: 'yaml', 19: 'html', 23: 'javascript', 68: 'go',
    };
    
    const langStr = typeof language === 'number' ? (langMap[language] || '') : String(language);

    return `\`\`\`${langStr}\n${codeText}\n\`\`\``;
  }

  private extractText(block: FeishuBlock): string {
    const typeKeys = [
      'text', 'heading1', 'heading2', 'heading3', 'heading4',
      'heading5', 'heading6', 'heading7', 'heading8', 'heading9',
      'bullet', 'ordered', 'todo', 'quote'
    ];

    for (const key of typeKeys) {
      const data = block[key];
      if (data) {
        const elements = data.elements;
        if (elements && elements.length > 0) {
          return this.elementsToText(elements);
        }
        
        const body = data.body;
        if (body && body.elements && body.elements.length > 0) {
          return this.elementsToText(body.elements);
        }

        if (data.content) {
          return data.content;
        }
      }
    }

    if (block.page) {
      const elements = block.page.elements;
      if (elements && elements.length > 0) {
        return this.elementsToText(elements);
      }
    }

    return '';
  }

  private elementsToText(elements: any[]): string {
    const parts: string[] = [];

    for (const elem of elements) {
      if (elem.text_run) {
        const tr = elem.text_run;
        let content = tr.content || '';
        const style = tr.text_element_style || {};

        if (style.strikethrough) content = `~~${content}~~`;
        if (style.bold) content = `**${content}**`;
        if (style.italic) content = `*${content}*`;
        if (style.inline_code) content = `\`${content}\``;
        
        parts.push(content);
      }

      if (elem.mention_doc) {
        const md = elem.mention_doc;
        const token = md.token || '';
        const rawType = md.obj_type ?? md.type ?? '';
        const title = md.title || '';

        const typeMap: Record<number, string> = {
          1: 'doc', 2: 'sheet', 3: 'bitable', 15: 'docx', 16: 'wiki', 22: 'wiki'
        };
        const objType = typeof rawType === 'number' ? (typeMap[rawType] || String(rawType)) : String(rawType);

        parts.push(`<mention-doc token="${token}" type="${objType}">${title}</mention-doc>`);
      }

      if (elem.mention_user) {
        const mu = elem.mention_user;
        const userId = mu.user_id || '';
        parts.push(`<mention-user id="${userId}"/>`);
      }

      if (elem.equation) {
        const eq = elem.equation;
        const content = eq.content || '';
        parts.push(`$${content}$`);
      }
    }

    const text = parts.join('');
    this.currentLength += text.length;
    return text;
  }

  private extractPageTitle(block: FeishuBlock): string {
    if (block.page && block.page.elements) {
      return this.elementsToText(block.page.elements);
    }
    return '';
  }
}
