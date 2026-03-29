import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { BlockRenderer, FeishuBlock } from '../../../../src/modules/document/utils/markdownRenderer.js';

describe('BlockRenderer', () => {
  it('should render basic headings and text properly', () => {
    const blocks: FeishuBlock[] = [
      {
        block_id: 'page1',
        parent_id: '',
        block_type: 1,
        children: ['h1', 't1', 'h2'],
        page: { elements: [{ text_run: { content: 'My Document Title' } }] }
      },
      {
        block_id: 'h1',
        parent_id: 'page1',
        block_type: 3, // H1
        children: [],
        heading1: { elements: [{ text_run: { content: 'Heading 1' } }] }
      },
      {
        block_id: 't1',
        parent_id: 'page1',
        block_type: 2, // Text
        children: [],
        text: { elements: [
          { text_run: { content: 'Hello, ' } },
          { text_run: { content: 'World!', text_element_style: { bold: true } } },
          { text_run: { content: ' this is ' } },
          { text_run: { content: 'italic', text_element_style: { italic: true } } },
          { text_run: { content: ' and ' } },
          { text_run: { content: 'code', text_element_style: { inline_code: true } } },
          { text_run: { content: ' and ' } },
          { text_run: { content: 'del', text_element_style: { strikethrough: true } } }
        ] }
      },
      {
        block_id: 'h2',
        parent_id: 'page1',
        block_type: 4, // H2
        children: [],
        heading2: { elements: [{ text_run: { content: 'Heading 2' } }] }
      }
    ];

    const renderer = new BlockRenderer(blocks);
    const result = renderer.render();

    assert.equal(result.doc_id, 'page1');
    assert.equal(result.title, 'My Document Title');
    assert.ok(result.markdown.includes('# Heading 1'));
    assert.ok(result.markdown.includes('## Heading 2'));
    assert.ok(result.markdown.includes('Hello, **World!** this is *italic* and `code` and ~~del~~'));
  });

  it('should render lists properly', () => {
    const blocks: FeishuBlock[] = [
      {
        block_id: 'page1',
        parent_id: '',
        block_type: 1,
        children: ['b1', 'o1'],
      },
      {
        block_id: 'b1',
        parent_id: 'page1',
        block_type: 12, // Bullet
        children: ['b2'],
        bullet: { elements: [{ text_run: { content: 'Bullet 1' } }] }
      },
      {
        block_id: 'b2',
        parent_id: 'b1',
        block_type: 12, // Bullet nested
        children: [],
        bullet: { elements: [{ text_run: { content: 'Nested bullet' } }] }
      },
      {
        block_id: 'o1',
        parent_id: 'page1',
        block_type: 13, // Ordered
        children: [],
        ordered: { elements: [{ text_run: { content: 'First ordered item' } }] }
      }
    ];

    const renderer = new BlockRenderer(blocks);
    const result = renderer.render();

    assert.ok(result.markdown.includes('- Bullet 1'));
    assert.ok(result.markdown.includes('  - Nested bullet'));
    assert.ok(result.markdown.includes('1. First ordered item'));
  });

  it('should render tables with fallback correctly', () => {
    const blocks: FeishuBlock[] = [
      {
        block_id: 'page1',
        parent_id: '',
        block_type: 1,
        children: ['table1'],
      },
      {
        block_id: 'table1',
        parent_id: 'page1',
        block_type: 31,
        children: ['cell1', 'cell2'],
        table: {
          property: { row_size: 1, column_size: 2, header_row_index: 0, column_width: [100, 200] }
        }
      },
      {
        block_id: 'cell1',
        parent_id: 'table1',
        block_type: 32, // TableCell
        children: ['t1'],
      },
      {
        block_id: 'cell2',
        parent_id: 'table1',
        block_type: 32,
        children: ['t2'],
      },
      {
        block_id: 't1',
        parent_id: 'cell1',
        block_type: 2,
        children: [],
        text: { elements: [{ text_run: { content: 'Cell A' } }] }
      },
      {
        block_id: 't2',
        parent_id: 'cell2',
        block_type: 2,
        children: [],
        text: { elements: [{ text_run: { content: 'Cell B' } }] }
      }
    ];

    const renderer = new BlockRenderer(blocks);
    const result = renderer.render();

    assert.ok(result.markdown.includes('<lark-table rows="1" cols="2" header-row="true" column-widths="100,200">'));
    assert.ok(result.markdown.includes('Cell A'));
    assert.ok(result.markdown.includes('Cell B'));
    assert.ok(result.markdown.includes('</lark-td>'));
    assert.ok(result.markdown.includes('</lark-table>'));
  });

  it('should render special mentions, equations, and code blocks', () => {
    const blocks: FeishuBlock[] = [
      {
        block_id: 'page1',
        parent_id: '',
        block_type: 1,
        children: ['code1', 'mention1', 'equation1'],
      },
      {
        block_id: 'code1',
        parent_id: 'page1',
        block_type: 14,
        children: [],
        code: {
          language: 63, // TS
          body: { elements: [{ text_run: { content: 'console.log("hi");' } }] }
        }
      },
      {
        block_id: 'mention1',
        parent_id: 'page1',
        block_type: 2,
        children: [],
        text: { elements: [
          { mention_doc: { token: 'D123', obj_type: 15, title: 'MyDoc' } },
          { text_run: { content: ' ' } },
          { mention_user: { user_id: 'U456' } }
        ] }
      },
      {
        block_id: 'equation1',
        parent_id: 'page1',
        block_type: 2,
        children: [],
        text: { elements: [
          { equation: { content: 'E=mc^2' } }
        ] }
      }
    ];

    const renderer = new BlockRenderer(blocks);
    const result = renderer.render();

    assert.ok(result.markdown.includes('\`\`\`typescript\nconsole.log("hi");\n\`\`\`'));
    assert.ok(result.markdown.includes('<mention-doc token="D123" type="docx">MyDoc</mention-doc>'));
    assert.ok(result.markdown.includes('<mention-user id="U456"/>'));
    assert.ok(result.markdown.includes('$E=mc^2$'));
  });

  it('should fallback unknown blocks without throwing', () => {
    const blocks: FeishuBlock[] = [
      {
        block_id: 'page1',
        parent_id: '',
        block_type: 1,
        children: ['unknown1'],
      },
      {
        block_id: 'unknown1',
        parent_id: 'page1',
        block_type: 9999, // Unknown
        children: [],
      }
    ];

    const renderer = new BlockRenderer(blocks);
    const result = renderer.render();

    assert.ok(result.markdown.includes('<!-- unknown block [type: 9999] -->'));
  });
});
