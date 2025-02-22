export enum AstNodeType {
  Unknown = 'Unknown',
  Space = 'Space',
  NewLine = 'NewLine',
  Hr = 'hr',
  Heading = 'Heading',
  Code = 'code',
  CodeInline = 'codeInline',
  Table = 'Table',
  TableCell = 'TableCell',
  TableRow = 'TableRow',
  TableHeader = 'TableHeader',
  Blockquote = 'blockquote',
  ExpandableBlockquote = 'blockquote expandable',
  List = 'List',
  ListItem = 'ListItem',
  LooseItem = 'LooseItem',
  Html = 'Html',
  Paragraph = 'Paragraph',
  Text = 'Text',
  Link = 'Link',
  Escape = 'Escape',
  Break = 'br',
  Strikethrough = 'Strikethrough',
  Italic = 'Italic',
  Bold = 'Bold',
  Image = 'img',
  Emoji = 'Emoji',
  Mark = 'mark',
  Underline = 'Underline',
  Spoiler = 'Spoiler',
  Sub = 'sub',
  Sup = 'sup',
}

export interface AstNode {
  type: AstNodeType;
  source: string;
}
export interface BlockNode extends AstNode {
  nodes: AstNode[];
}
export interface ListNode extends BlockNode {
  ordered: boolean;
}
export interface TextNode extends AstNode {
  text: string;

}
export interface HtmlNode extends TextNode {
  pre: boolean;
}
export interface LinkNode extends BlockNode {
  id: string;
  title: string;
  href: string;
}
export interface CodeNode extends BlockNode {
  lang: string;
}
export interface HeadingNode extends BlockNode {
  depth: number;
}
export interface TableNode extends BlockNode {
  headers: TableCellNode[];
}
export interface TableCellNode extends BlockNode {
  align: string | undefined;
}
export enum RuleType {
  space = 'space',
  code = 'code',
  fences = 'fences',
  heading = 'heading',
  lheading = 'lheading',
  hr = 'hr',
  npTable = 'npTable',
  blockquote = 'blockquote',
  expandableBlockquote = 'expandableBlockquote',
  list = 'list',
  html = 'html',
  def = 'def',
  table = 'table',
  paragraph = 'paragraph',
  text = 'text',
  newLine = 'newLine',
  escape = 'escape',
  image = 'image',
  autoLink = 'autoLink',
  emoji = 'emoji',
  url = 'url',
  tag = 'tag',
  link = 'link',
  refLink = 'refLink',
  idLink = 'idLink',
  bold = 'bold',
  italic = 'italic',
  monospace = 'monospace',
  br = 'br',
  strike = 'strike',
  mark = 'mark',
  underline = 'underline',
  spoiler = 'spoiler',
  sub = 'sub',
  sup = 'sup',
  blockquoteInline = 'blockquoteInline',
  textInline = 'textInline',
}
export interface Rule {
  type: RuleType;
  reg: RegExp;
}
export interface RuleTop extends Rule {
  useTop: boolean;
}

const itemReg = /^( *)((?:[*+-]|\d+\.)) [^\n]*(?:\n(?!\1(?:[*+-]|\d+\.) )[^\n]*)*/gm;
const listItemReplaceReg = /^ *([*+-]|\d+\.) +/;
const isLoosReg = /\n\n(?!\s*$)/;
const replaceReg = /[\\~#%&*{}/:<>?|\\"-]/gm;
const documentIdReg = /(\?|&)id=(.*)/;

const entityMap : Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};
const emojiMap : Record<string, string> = {
  ':-)': '&#128515;',
  ':-(': '&#128550;',
  '8-)': '&#128526;',
  ';)': '&#128521;',
  ':wink:': '&#128521;',
  ':cry:': '&#128546;',
  ':laughing:': '&#128518;',
  ':yum:': '&#128523;',
};
function replace(str: string) {
  if (str) {
    return str.replace(replaceReg, (s) => {
      const ch = entityMap[s];
      if (ch) return ch;
      return '';
    });
  }
  return '';
}
function notEmpty(source: string[], index1: number, index2: number) {
  return (source.length > index1 && source[index1]) ? source[index1] : source[index2];
}

class AstBuilder {
  private links: Record<string, AstNode> = {};

  private rules: Rule[];

  constructor(markdownRules: Rule[]) {
    this.rules = markdownRules;
  }

  // eslint-disable-next-line class-methods-use-this
  private escape(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Escape,
      source: match[0],
      text: match[1],
    } as TextNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private link(nodes: AstNode[], match: RegExpMatchArray) {
    const id = match[2] ? documentIdReg.exec(match[2]) : undefined;
    nodes.push({
      type: match[0][0] === '!' ? AstNodeType.Image : AstNodeType.Link,
      source: match[0],
      nodes: this.build(match[1]),
      href: match[2],
      title: replace(match[4]),
      id: id ? id[2] : undefined,
    } as LinkNode);
  }

  // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-unused-vars
  private autoLink(nodes: AstNode[], match: RegExpMatchArray) {

  }

  // eslint-disable-next-line class-methods-use-this
  private refLink(nodes: AstNode[], match: RegExpMatchArray) {
    const id = match[2].toLowerCase();
    const link = {
      type: match[0][0] === '!' ? AstNodeType.Image : AstNodeType.Link,
      source: match[0],
      nodes: this.build(match[1]),
    } as LinkNode;
    this.links[id] = link;
    nodes.push(link);
  }

  // eslint-disable-next-line class-methods-use-this
  private idLink(nodes: AstNode[], match: RegExpMatchArray) {
    const id = match[1].toLowerCase();
    const link = this.links[id] as LinkNode;
    if (link) {
      link.href = match[2];
      link.title = replace(match[4]);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private bold(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Bold,
      source: match[0],
      nodes: this.build(notEmpty(match, 2, 1)),
    } as BlockNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private italic(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Italic,
      source: match[0],
      nodes: this.build(notEmpty(match, 2, 1)),
    } as BlockNode);
  }

  // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-unused-vars
  private br(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Break,
      source: match[0],
    });
  }

  // eslint-disable-next-line class-methods-use-this
  private strike(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Strikethrough,
      source: match[0],
      nodes: this.build(match[1]),
    } as BlockNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private mark(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Mark,
      source: match[0],
      nodes: this.build(match[1]),
    } as BlockNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private underline(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Underline,
      source: match[0],
      nodes: this.build(match[1]),
    } as BlockNode);
  }

  private spoiler(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Spoiler,
      source: match[0],
      nodes: this.build(match[1]),
    } as BlockNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private sub(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Sub,
      source: match[0],
      nodes: this.build(match[1]),
    } as BlockNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private sup(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Sup,
      source: match[0],
      nodes: this.build(match[1]),
    } as BlockNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private blockquoteInline(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Blockquote,
      source: match[0],
      nodes: this.build(match[1], false),
    } as BlockNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private textInline(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Text,
      source: match[0],
      text: match[0],
    } as TextNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private newLine(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({ type: AstNodeType.NewLine, source: match[0] });
  }

  // eslint-disable-next-line class-methods-use-this
  private space(nodes: AstNode[], match: RegExpMatchArray) {
    if (match[0].length > 1) nodes.push({ type: AstNodeType.Space, source: match[0] });
  }

  // eslint-disable-next-line class-methods-use-this
  private monospace(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.CodeInline,
      source: match[0],
      nodes: this.build(match[2]),
    } as BlockNode);
  }

  // // eslint-disable-next-line class-methods-use-this
  // private code(nodes: AstNode[], match: RegExpMatchArray) {
  //   const capStr = match[0].replace('^ {4}/gm', '');
  //   nodes.push({
  //     type: AstNodeType.Code,
  //     source: match[0],
  //     nodes: this.build(capStr.replace('\\n+$', '')),
  //   } as BlockNode);
  // }

  // eslint-disable-next-line class-methods-use-this
  private fences(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Code,
      source: match[0],
      lang: match[2],
      nodes: this.build(match[3]),
    } as CodeNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private heading(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Heading,
      source: match[0],
      depth: match[1].length,
      nodes: this.build(match[2]),
    } as HeadingNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private lheading(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Heading,
      source: match[0],
      depth: match[2] === '=' ? 1 : 2,
      nodes: this.build(match[1]),
    } as HeadingNode);
  }

  // eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-unused-vars
  private hr(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Hr,
      source: match[0],
    });
  }

  // eslint-disable-next-line class-methods-use-this
  // private npTable(nodes: AstNode[], match: RegExpMatchArray) {
  //   // const c = match[3].replace('\\n$', '').split('\\n');
  //   // const headers = match[1].replace('^ *| *\\| *$', '').split(' *\\| *');
  //   // const aligns = match[2].replace('^ *|\\| *$', '').split(' *\\| ');
  //   //
  //   // const header: TableCellNode[] = [];
  //   // const align: Array<string | undefined> = [];
  //   // const cells: TableCellNode[] = [];
  //   // const rows: AstNode[] = [];
  //   //
  //   // for (let i = 0; i < aligns.length; i++) {
  //   //   if (align[i]?.match('^ *-+: *$')) {
  //   //     align[i] = 'right';
  //   //   } else if (align[i]?.match('^ *:-+: *$')) {
  //   //     align[i] = 'center';
  //   //   } else if (align[i]?.match('^ *:-+ *$')) {
  //   //     align[i] = 'left';
  //   //   } else {
  //   //     align[i] = undefined;
  //   //   }
  //   // }
  //   // for (let i = 0; i < headers.length; i++) {
  //   //   header[i] = {
  //   //     type: AstNodeType.TableHeader,
  //   //     source: headers[i],
  //   //     nodes: this.build(headers[i]),
  //   //     align: align[i],
  //   //   };
  //   // }
  //   // // for (let i = 0; i < c.length; i++) {
  //   // //   let row = c[i];
  //   // //   table.cells.push(c[i][0].split(' *\\| *'));
  //   // // }
  //   //
  //   // nodes.push({
  //   //   type: AstNodeType.Table,
  //   //   source: match[0],
  //   //   headers: header,
  //   //   nodes: rows,
  //   // } as TableNode);
  // }

  // eslint-disable-next-line class-methods-use-this
  private expandableBlockquote(nodes: AstNode[], match: RegExpMatchArray, top: boolean) {
    const capStr = match[0].replace(/^ *\*\*> ?/gm, '');
    nodes.push({
      type: AstNodeType.ExpandableBlockquote,
      source: match[0],
      nodes: this.build(capStr, top),
    } as BlockNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private blockquote(nodes: AstNode[], match: RegExpMatchArray, top: boolean) {
    let type = AstNodeType.Blockquote;
    const source = match[0];
    let capStr = source.replace(/^ *> ?/gm, '');
    if (source.length > 1 && source[source.length - 1] === '|' && source[source.length - 2] === '|') {
      type = AstNodeType.ExpandableBlockquote;
      capStr = capStr.replace(/\|\|/gm, '');
    }

    nodes.push({
      type,
      source,
      nodes: this.build(capStr, top),
    } as BlockNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private list(nodes: AstNode[], match: RegExpMatchArray) {
    const bull = match[2];
    const list = {
      type: AstNodeType.List,
      source: match[0],
      nodes: [],
      ordered: bull.length > 1,
    } as ListNode;
    const cap = match[0].match(itemReg);
    if (cap && cap[0].length > 0) {
      let next = false;
      const l = cap?.length;

      for (let i = 0; i < l; i++) {
        let s = cap[i];
        if (!s) continue;
        s = s.replace(listItemReplaceReg, '').replace(/[\n]/g, '');
        let loose: boolean = next || s.match(isLoosReg) !== undefined;
        if (i !== l - 1) {
          next = s[s.length - 1] === '\n';
          if (!loose) loose = next;
        }
        list.nodes.push({
          type: loose ? AstNodeType.LooseItem : AstNodeType.ListItem,
          source: cap[i],
          nodes: this.build(s),
        } as BlockNode);
      }
      nodes.push(list);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private html(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Html,
      source: match[0],
      pre: match[1] === 'pre' || match[1] === 'script' || match[1] === 'style',
      text: match[0],
    } as HtmlNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private def(nodes: AstNode[], match: RegExpMatchArray) {
    nodes.push({
      type: AstNodeType.Link,
      source: match[0],
      nodes: this.build(match[1]),
      href: match[2],
      title: match[3],
    } as LinkNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private table(nodes: AstNode[], match: RegExpMatchArray) {
    const c = match[3].replace(/(?: *\| *)?\n$/g, '').split(/\n/);
    const hs = match[1].replace(/^ *| *\| *$/g, '').split(/ *\| */);
    const als = match[2].replace(/^ *|\| *$/g, '').split(/ * *\| */);

    const headers: TableCellNode[] = [];
    const aligns: Array<string | undefined> = [];
    const rows: AstNode[] = [];

    for (let i = 0; i < als.length; i++) {
      if (als[i]?.match('^ *-+: *$')) {
        aligns[i] = 'right';
      } else if (als[i]?.match('^ *:-+: *$')) {
        aligns[i] = 'center';
      } else if (als[i]?.match('^ *:-+ *$')) {
        aligns[i] = 'left';
      } else {
        aligns[i] = undefined;
      }
    }
    for (let i = 0; i < hs.length; i++) {
      headers[i] = {
        type: AstNodeType.TableHeader,
        source: hs[i],
        nodes: this.build(hs[i]),
        align: aligns[i],
      };
    }

    for (let i = 0; i < c.length; i++) {
      const row = c[i].replace(/^ *\| *| *\| *$/g, '').split(/ *\| /);
      const cells: TableCellNode[] = [];
      for (let j = 0; j < row.length; j++) {
        cells.push({
          type: AstNodeType.TableCell,
          source: row[j],
          nodes: this.build(row[j]),
          align: aligns[j],
        });
      }
      rows.push({
        type: AstNodeType.TableRow,
        source: c[i],
        nodes: cells,
      } as BlockNode);
    }

    nodes.push({
      type: AstNodeType.Table,
      source: match[0],
      headers,
      nodes: rows,
    } as TableNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private paragraph(nodes: AstNode[], match: RegExpMatchArray) {
    const pText = match[1][match[1].length - 1] === '\n' ? match[1].substring(0, match[1].length - 1) : match[1];
    nodes.push({
      type: AstNodeType.Paragraph,
      source: match[0],
      nodes: this.build(pText),
    } as BlockNode);
  }

  // eslint-disable-next-line class-methods-use-this
  private text(nodes: AstNode[], match: RegExpMatchArray) {
    if (match[1]) {
      const pText = match[1][match[1].length - 1] === '\n' ? match[1].substring(0, match[1].length - 1) : match[1];
      nodes.push({
        type: AstNodeType.Paragraph,
        source: match[0],
        nodes: this.build(pText),
      } as BlockNode);
    } else {
      nodes.push({
        type: AstNodeType.Paragraph,
        source: match[0],
        text: match[0],
      } as TextNode);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  public build(src: string, top = false) {
    src = src.replace(/^ +$/gm, '');
    const nodes : AstNode[] = [];
    // eslint-disable-next-line no-labels,no-restricted-syntax
    next: while (src) {
      for (const rule of this.rules) {
        const rtop = rule as RuleTop;
        if (rtop && rtop.useTop && !top) continue;
        const match = rule.reg.exec(src);
        if (!match) continue;
        const prev = src;
        src = src.substring(match[0].length);
        switch (rule.type) {
          case RuleType.newLine:
            this.newLine(nodes, match);
            break;
          case RuleType.space:
            this.space(nodes, match);
            break;
          // case RuleType.code:
          //   this.code(nodes, match);
          //   break;
          case RuleType.fences:
            this.fences(nodes, match);
            break;
          case RuleType.heading:
            this.heading(nodes, match);
            break;
          case RuleType.lheading:
            this.lheading(nodes, match);
            break;
          case RuleType.hr:
            this.hr(nodes, match);
            break;
          // case RuleType.npTable:
          //   this.npTable(nodes, match);
          //   break;
          case RuleType.expandableBlockquote:
            this.expandableBlockquote(nodes, match, top);
            break;
          case RuleType.blockquote:
            this.blockquote(nodes, match, top);
            break;
          case RuleType.list:
            this.list(nodes, match);
            break;
          case RuleType.html:
            this.html(nodes, match);
            break;
          case RuleType.def:
            this.def(nodes, match);
            break;
          case RuleType.table:
            this.table(nodes, match);
            break;
          case RuleType.paragraph:
            this.paragraph(nodes, match);
            break;

          case RuleType.escape:
            this.escape(nodes, match);
            break;
          case RuleType.image:
            this.link(nodes, match);
            break;
          case RuleType.autoLink:
            this.autoLink(nodes, match);
            break;
          case RuleType.emoji:
            src = prev;
            src = src.replace(match[0], emojiMap[match[1]]);
            // eslint-disable-next-line no-case-declarations
            let cap;
            // eslint-disable-next-line no-cond-assign
            while ((cap = rule.reg.exec(src))) {
              src = src.replace(cap[0], emojiMap[cap[1]]);
            }
            break;
          case RuleType.url:
            this.link(nodes, match);
            break;
          case RuleType.tag:

            break;
          case RuleType.link:
            this.link(nodes, match);
            break;
          case RuleType.refLink:
            this.refLink(nodes, match);
            break;
          case RuleType.idLink:
            this.idLink(nodes, match);
            break;
          case RuleType.bold:
            this.bold(nodes, match);
            break;
          case RuleType.italic:
            this.italic(nodes, match);
            break;
          case RuleType.monospace:
            this.monospace(nodes, match);
            break;
          case RuleType.br:
            this.br(nodes, match);
            break;
          case RuleType.strike:
            this.strike(nodes, match);
            break;
          case RuleType.mark:
            this.mark(nodes, match);
            break;
          case RuleType.underline:
            this.underline(nodes, match);
            break;
          case RuleType.spoiler:
            this.spoiler(nodes, match);
            break;
          case RuleType.sub:
            this.sub(nodes, match);
            break;
          case RuleType.sup:
            this.sup(nodes, match);
            break;
          case RuleType.blockquoteInline:
            this.blockquoteInline(nodes, match);
            break;
          case RuleType.textInline:
            this.textInline(nodes, match);
            break;
          case RuleType.text:
            this.text(nodes, match);
            break;
        }
        // eslint-disable-next-line no-labels
        continue next;
      }
      if (src) {
        throw new Error(`Infinite loop on byte: ${src[0]}`);
      }
    }
    return nodes;
  }
}

export function markdownToAstTree(markdownRules: Rule[], src: string) {
  src = src
    .replace(/[\r]/g, '')
    .replace('\t', '    ')
    .replace('\u00a0', ' ')
    .replace('\u2424', '\n');
  return new AstBuilder(markdownRules).build(src, true);
}
