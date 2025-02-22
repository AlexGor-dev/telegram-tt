import type {
  AstNode, BlockNode, CodeNode, HeadingNode, LinkNode, ListNode, TableCellNode,
  TableNode, TextNode,
} from './astBuilder';
import { ApiMessageEntityTypes } from '../../api/types';

import { IS_EMOJI_SUPPORTED } from '../windowEnvironment';
import { AstNodeType } from './astBuilder';

export function astDefaultRender(nodes: AstNode[]) : string {
  if (!nodes) return '';
  let out : string = '';
  for (const node of nodes) {
    const block = node as BlockNode;
    switch (node.type) {
      case AstNodeType.Emoji:
      case AstNodeType.Text:
        out += (node as TextNode).text;
        break;
      case AstNodeType.Paragraph:
        out += `<p>${astRender(block.nodes)}</p>`;
        break;
      case AstNodeType.Blockquote:
        out += `<blockquote>${astRender(block.nodes)}</blockquote>\n`;
        break;
      case AstNodeType.ExpandableBlockquote:
        out += `<blockquote class='expandable'>${astRender(block.nodes)}</blockquote>\n`;
        break;
      case AstNodeType.Break:
        out += '<br>';
        break;
      case AstNodeType.Space:
        out += ' ';
        break;
      case AstNodeType.NewLine:
        out += '<br>';
        break;
      case AstNodeType.CodeInline:
        out += `<code class="text-entity-code">${(node as TextNode).text}</code>`;
        break;
      case AstNodeType.Code: {
        const code = node as CodeNode;
        if (code.lang) {
          out += `<pre class="text-entity-pre"><code class='language-${code.lang}'>${astRender(block.nodes)}</code></pre>`;
        } else {
          out += `<pre class="text-entity-pre"><code class="text-entity-code">${astRender(block.nodes)}</code></pre>`;
        }
      }
        break;
      case AstNodeType.Heading: {
        const h = node as HeadingNode;
        out += `<h${h.depth} id="-">${astRender(h.nodes)}</h${h.depth}>\n`;
      }
        break;
      case AstNodeType.Italic:
        out += `<i>${astRender(block.nodes)}</i>`;
        break;
      case AstNodeType.Bold:
        out += `<b>${astRender(block.nodes)}</b>`;
        break;
      case AstNodeType.Strikethrough:
        out += `<s>${astRender(block.nodes)}</s>`;
        break;
      case AstNodeType.Mark:
        out += `<mark>${astRender(block.nodes)}</mark>`;
        break;
      case AstNodeType.Underline:
        out += `<u>${astRender(block.nodes)}</u>`;
        break;
      case AstNodeType.Spoiler:
        out += `<span class='spoiler'>${astRender(block.nodes)}</span>`;
        break;
      case AstNodeType.Sub:
        out += `<sub>${astRender(block.nodes)}</sub>`;
        break;
      case AstNodeType.Sup:
        out += `<sup>${astRender(block.nodes)}</sup>`;
        break;
      case AstNodeType.ListItem:
      case AstNodeType.LooseItem:
        out += `<li>${astRender(block.nodes)}</li>`;
        break;
      case AstNodeType.List: {
        const list = node as ListNode;
        const type = list.ordered ? 'ol' : 'ul';
        out += `<${type}>${astRender(list.nodes)}</${type}>`;
      }
        break;
      case AstNodeType.Link: {
        const link = node as LinkNode;
        let title = '';
        let target = '';
        if (link.title) title = ` title='${link.title}'`;
        if (link.href && (link.href.startsWith('//') || link.href.toLowerCase().startsWith('http'))) target = ' target=\'_blank\' rel=\'nofollow\'';
        out += `<a class="text-entity-link" href=${link.href}${title}${target} dir="auto">${astRender(block.nodes)}</a>`;
      }
        break;
      case AstNodeType.Image: {
        const image = node as LinkNode;
        let title = '';
        let alt = '';
        let documentId = '';
        if (image.title) title = ` title='${image.title}'`;
        if (image.nodes) alt = ` alt='${astRender(block.nodes)}'`;
        if (image.id) documentId = ` data-document-id='${image.id}'`;
        out += `<img src=${image.href}${title}${alt}${documentId}/>`;
      }
        break;
      case AstNodeType.TableCell: {
        const cell = block as TableCellNode;
        let style = '';
        if (cell.align) style = ` style='text-align:${cell.align}'`;
        out += `<td${style}>${astRender(block.nodes)}</td\n>`;
      }
        break;
      case AstNodeType.TableHeader: {
        const cell = block as TableCellNode;
        let style = '';
        if (cell.align) style = ` style='text-align:${cell.align}'`;
        out += `<th${style}>${astRender(block.nodes)}</th>\n`;
      }
        break;
      case AstNodeType.TableRow:
        out += `<tr>${astRender(block.nodes)}</tr>\n`;
        break;
      case AstNodeType.Table: {
        const table = block as TableNode;
        out += `<table>\n<thead>\n${astRender(table.headers)}</thead>\n<tbody>\n${astRender(table.nodes)}</tbody>\n</table>\n`;
      }
        break;
      case AstNodeType.Escape:
        break;
      case AstNodeType.Hr:
        out += '<hr>';
        break;
      case AstNodeType.Html:
        out += (node as TextNode).text;
        break;
    }
  }
  return out;
}
export function astRender(nodes: AstNode[]) : string {
  if (!nodes) return '';
  let out : string = '';
  for (const node of nodes) {
    const block = node as BlockNode;
    switch (node.type) {
      case AstNodeType.Emoji:
      case AstNodeType.Text:
        out += (node as TextNode).text;
        break;
      case AstNodeType.Paragraph:
        out += `<p>${astRender(block.nodes)}</p>`;
        break;
      case AstNodeType.Blockquote:
        out += `<blockquote>${astRender(block.nodes)}</blockquote>`;
        break;
      case AstNodeType.ExpandableBlockquote:
        out += `<blockquote class='expandable'>${astRender(block.nodes)}</blockquote>\n`;
        break;
      case AstNodeType.Break:
        out += '<br>';
        break;
      case AstNodeType.Space:
        out += ' ';
        break;
      case AstNodeType.NewLine:
        out += '<br>';
        break;
      case AstNodeType.CodeInline:
        out += `<code>${astRender(block.nodes)}</code>`;
        break;
      case AstNodeType.Code: {
        const code = node as CodeNode;
        let lang = '';
        if (code.lang)lang = `${code.lang}`;
        out += `<pre class="CodeBlock" data-language='${lang}'>${astRender(block.nodes)}</pre>\n`;
      }
        break;
      case AstNodeType.Heading: {
        const h = node as HeadingNode;
        out += `<h${h.depth} id="-">${astRender(h.nodes)}</h${h.depth}>\n`;
      }
        break;
      case AstNodeType.Italic:
        out += `<i>${astRender(block.nodes)}</i>`;
        break;
      case AstNodeType.Bold:
        out += `<b>${astRender(block.nodes)}</b>`;
        break;
      case AstNodeType.Strikethrough:
        out += `<strike>${astRender(block.nodes)}</strike>`;
        break;
      case AstNodeType.Mark:
        out += `<mark>${astRender(block.nodes)}</mark>`;
        break;
      case AstNodeType.Underline:
        out += `<u>${astRender(block.nodes)}</u>`;
        break;
      case AstNodeType.Spoiler:
        out += `<span data-entity-type='${ApiMessageEntityTypes.Spoiler}'>${astRender(block.nodes)}</span>`;
        break;
      case AstNodeType.Sub:
        out += `<sub>${astRender(block.nodes)}</sub>`;
        break;
      case AstNodeType.Sup:
        out += `<sup>${astRender(block.nodes)}</sup>`;
        break;
      case AstNodeType.ListItem:
      case AstNodeType.LooseItem:
        out += `<li>${astRender(block.nodes)}</li>`;
        break;
      case AstNodeType.List: {
        const list = node as ListNode;
        const type = list.ordered ? 'ol' : 'ul';
        out += `<${type}>${astRender(list.nodes)}</${type}>`;
      }
        break;
      case AstNodeType.Link: {
        const link = node as LinkNode;
        let title = '';
        const userId = '';
        if (link.title) title = ` title='${link.title}'`;
        out += `<a href='${link.href}'${title}${userId}>${astRender(block.nodes)}</a>`;
      }
        break;
      case AstNodeType.Image: {
        const image = node as LinkNode;
        let title = '';
        let alt = '';
        const documentId = '';
        if (image.title) title = ` title='${image.title}'`;
        if (image.nodes) alt = ` alt='${astRender(block.nodes)}'`;
        if (IS_EMOJI_SUPPORTED) {
          out += `<img src='${image.href}'${title}${documentId}${alt}/>`;
        } else {
          out += `<a href='${image.href}'${title}${documentId}>${astRender(block.nodes)}</a>`;
        }
      }
        break;
      case AstNodeType.TableCell: {
        const cell = block as TableCellNode;
        let style = '';
        if (cell.align) style = ` style='text-align:${cell.align}'`;
        out += `<td${style}>${astRender(block.nodes)}</td\n>`;
      }
        break;
      case AstNodeType.TableHeader: {
        const cell = block as TableCellNode;
        let style = '';
        if (cell.align) style = ` style='text-align:${cell.align}'`;
        out += `<th${style}>${astRender(block.nodes)}</th>\n`;
      }
        break;
      case AstNodeType.TableRow:
        out += `<tr>${astRender(block.nodes)}</tr>\n`;
        break;
      case AstNodeType.Table: {
        const table = block as TableNode;
        out += `<table>\n<thead>\n${astRender(table.headers)}</thead>\n<tbody>\n${astRender(table.nodes)}</tbody>\n</table>\n`;
      }
        break;
      case AstNodeType.Escape:
        break;
      case AstNodeType.Hr:
        out += '<hr>';
        break;
      case AstNodeType.Html:
        out += (node as TextNode).text;
        break;
    }
  }
  return out;
}
