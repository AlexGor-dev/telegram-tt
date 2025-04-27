// eslint-disable-next-line max-classes-per-file
import type {
  ApiFormattedText,
  ApiMessageEntity, ApiMessageEntityCustomEmoji, ApiMessageEntityMentionName, ApiMessageEntityPre, ApiMessageEntityTextUrl,
} from '../../api/types';
import { ApiMessageEntityTypes } from '../../api/types';

import { buildCustomEmojiHtmlFromEntity } from '../../components/middle/composer/helpers/customEmoji';
import { findNode, getNodePosition } from '../selection';
import {
  htmlToMarkdown, isHtml, TG_TAGS, validateHtml,
} from './htmlToMarkdown';

import { codeBlockHtml } from '../../components/common/code/CodeBlock';

const extractorEl = document.createElement('div');
const validUrlChars = /[A-Za-z0-9-._~?#\\[\]@!$&'*+,;%=]+/;

const EDITABLE_NODE = 'editable-node';
const NODE_CLOSED = 'node-closed';
const EMOJI_KEY = 'emoji';
const URL_KEY = 'url';

export enum AstNodeType {
  None = 'None',
  Root = 'Root',
  Text = 'Text',
  Underline = 'Underline',
  Url = 'Url',
  Emoji = 'Emoji',
  Code = '`',
  Bold = '*',
  Italic = '_',
  Blockquote = '>',
  Pre = 'Pre',
  Spoiler = '|',
  Strike = '~',
  Br = '\n',
  R = '\r',
  Link = '[',
  Slash = '/',
  Colon = ':',
}

export const AST_TYPE_BY_NODE_NAME: Record<string, AstNodeType> = {
  B: AstNodeType.Bold,
  STRONG: AstNodeType.Bold,
  I: AstNodeType.Italic,
  EM: AstNodeType.Italic,
  INS: AstNodeType.Underline,
  U: AstNodeType.Underline,
  S: AstNodeType.Strike,
  STRIKE: AstNodeType.Strike,
  DEL: AstNodeType.Strike,
  SPAN: AstNodeType.Spoiler,
  CODE: AstNodeType.Code,
  PRE: AstNodeType.Pre,
  BLOCKQUOTE: AstNodeType.Blockquote,
  A: AstNodeType.Link,
  DIV: AstNodeType.None,
  IMG: AstNodeType.Emoji,
};

export const OFFSET_CURSOR_BY_AST_TYPE: Record<string, number> = {
  '*': 4,
  _: 4,
  Underline: 2,
  '~': 4,
  '|': 4,
  Pre: 6,
  '`': 2,
  '>': 1,
};
export const CHAR_BY_AST_TYPE: Record<string, string> = {
  '*': '*',
  _: '_',
  Underline: '_',
  '~': '~',
  '|': '|',
  Pre: '`',
  '`': '`',
  '>': '>',
};
export class AstNode {
  type: AstNodeType;

  parent?: BlockNode | undefined;

  startIndex: number;

  endIndex: number;

  closed?: boolean;

  constructor(parent: BlockNode | undefined, startIndex: number, type: AstNodeType) {
    this.parent = parent;
    this.startIndex = startIndex;
    this.endIndex = startIndex;
    this.type = type;
  }

  getLength() {
    return this.endIndex - this.startIndex;
  }

  isEmpty() {
    return this.getLength() === 0;
  }

  isClosed() {
    return this.endIndex > this.startIndex;
  }

  getRoot() : RootNode {
    if (!this.parent) {
      return this as unknown as RootNode;
    }
    return this.parent?.getRoot();
  }

  getText() {
    return this.getRoot().text.substring(this.startIndex, this.endIndex);
  }

  public toString = () : string => {
    return `(${this.type}) ${this.getText()}`;
  };
}

class UrlNode extends AstNode {
  prefix?: AstNode;

  suffix?: AstNode;

  tgType?: string;

  tgId?: string;

  public constructor(parent: BlockNode, startIndex: number) {
    super(parent, startIndex, AstNodeType.Url);
  }

  getEntryType() {
    if (this.tgType) {
      switch (this.tgType) {
        case 'user':
          return ApiMessageEntityTypes.MentionName;
        case 'emoji':
          return ApiMessageEntityTypes.CustomEmoji;
      }
    }
    return ApiMessageEntityTypes.TextUrl;
  }
}

class LinkNode extends AstNode {
  title?: AstNode;

  url?: UrlNode;

  public constructor(parent: BlockNode, startIndex: number) {
    super(parent, startIndex, AstNodeType.Link);
  }

  getEntryType() {
    if (this.url) {
      return this.url.getEntryType();
    }
    return ApiMessageEntityTypes.TextUrl;
  }
}

export class BlockNode extends AstNode {
  nodes: AstNode[];

  entity?: ApiMessageEntity;

  constructor(parent: BlockNode | undefined, startIndex: number, type: AstNodeType) {
    super(parent, startIndex, type);
    this.nodes = [];
  }

  getNotClosed(type: AstNodeType): BlockNode | undefined {
    if (!this.isClosed() && this.type === type) return this;
    if (!this.parent) return undefined;
    return this.parent.getNotClosed(type);
  }

  isRoot() {
    return this.type === AstNodeType.Root;
  }

  getNotTextNode() {
    for (const n of this.nodes) {
      if (n.type !== AstNodeType.Text && n.type !== AstNodeType.Br) {
        return n;
      }
    }
    return undefined;
  }

  isNotTextNodes() {
    for (const n of this.nodes) {
      if (n.type !== AstNodeType.Text) {
        return true;
      }
    }
    return false;
  }

  firstNode() {
    return this.nodes[0];
  }

  lastNode() {
    return this.nodes[this.nodes.length - 1];
  }
}

export class CodeNode extends AstNode {
  lang?: AstNode;

  code?: AstNode;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(parent: BlockNode, startIndex: number, type: AstNodeType) {
    super(parent, startIndex, type);
  }
}

export class RootNode extends BlockNode {
  text: string;

  useClosed: boolean;

  constructor(text: string, useClosed = false) {
    super(undefined, 0, AstNodeType.Root);
    this.text = text;
    this.useClosed = useClosed;
  }
}

interface Ref {
  value: number;
}

function removeNode(parent: BlockNode, node: AstNode) {
  const i = parent.nodes.indexOf(node);
  if (i >= 0) {
    parent.nodes.splice(i, 1);
    return true;
  }
  return false;
}

export function isEditableElement(element: Node | undefined | null) {
  return element instanceof HTMLElement && element.classList.contains(EDITABLE_NODE);
}

export function isEditableChilds(element: Node | undefined | null) {
  if (isEditableElement(element)) {
    return true;
  }
  for (const child of element!.childNodes) {
    if (isEditableChilds(child)) {
      return true;
    }
  }
  return false;
}

export function isClosedElement(element: Node | undefined | null) {
  return element instanceof HTMLElement && element.classList.contains(NODE_CLOSED);
}

function findClosedElement(a: Node, b: Node): [HTMLElement | undefined, HTMLElement | undefined] {
  if (a instanceof HTMLElement && b instanceof HTMLElement && a.nodeName === b.nodeName) {
    if (isClosedElement(a) && !isClosedElement(b)) {
      return [a, b];
    }
    for (let i = 0; i < a.childNodes.length; i++) {
      const [a2, b2] = findClosedElement(a.childNodes[i], b.childNodes[i]);
      if (a2) {
        return [a2, b2];
      }
    }
  }
  return [undefined, undefined];
}
export function getClosedElement(prevElement: HTMLElement, newElement: Node | null, findElement: HTMLElement): [HTMLElement | undefined, HTMLElement | undefined] {
  if (newElement instanceof HTMLElement && !isClosedElement(findElement)) {
    while (newElement instanceof HTMLElement && newElement.tagName === 'DIV') {
      newElement = newElement.lastChild;
    }
    return findClosedElement(newElement!, prevElement);
  }
  return [undefined, undefined];
}

function checkLastChar(node: AstNode, minLength: number, ch: string, count: number, closeOnEndText = false) {
  if (node.getLength() >= minLength) {
    const text = node.getRoot().text;
    if (closeOnEndText && node.endIndex === text.length) {
      return true;
    }
    let index = node.endIndex - 1;
    while (count > 0) {
      if (text[index] !== ch) {
        return false;
      }
      count--;
      index--;
    }
    return true;
  }
  return false;
}

function getNodeElement(element: Node | undefined):[Node | undefined, AstNodeType] {
  if (element) {
    const type = AST_TYPE_BY_NODE_NAME[element.nodeName];
    switch (type) {
      case AstNodeType.Code:
        if (element instanceof HTMLElement) {
          switch (element.dataset.entityType) {
            case ApiMessageEntityTypes.Code:
              return [element, AstNodeType.Code];
            case ApiMessageEntityTypes.TextUrl:
            case ApiMessageEntityTypes.MentionName:
              return [element, AstNodeType.Link];
            case ApiMessageEntityTypes.CustomEmoji:
              return [element, AstNodeType.Emoji];
          }
          return getNodeElement(element.parentElement!);
        }
        break;
      case AstNodeType.Spoiler:
        if (element instanceof HTMLElement && element.dataset.entityType !== ApiMessageEntityTypes.Spoiler) {
          return getNodeElement(element.parentElement!);
        }
        break;
    }
    if (type) {
      return [element, type];
    }
    return getNodeElement(element.parentElement!);
  }
  return [undefined, AstNodeType.None];
}

export function setNotClosedNodes(element: Node | undefined) {
  if (element instanceof HTMLElement) {
    element.classList.remove(NODE_CLOSED);
    for (const child of element.children) {
      setNotClosedNodes(child);
    }
  }
}
export function setEditableNodes(root: HTMLElement, element: Node | undefined, cursorPos: number) {
  if (element instanceof HTMLElement) {
    if (!isClosedElement(element)) {
      setEditableNode(root, element, cursorPos, true);
    }
    for (const child of element.children) {
      setEditableNodes(root, child, cursorPos);
    }
  }
}

export function setEditableNode(root: HTMLElement, element: Node | undefined, cursorPos: number, olnlyNotClosed = false) {
  let offset = 0;
  const [el, type] = getNodeElement(element);
  const closed = isClosedElement(el);
  if (element && type !== AstNodeType.None && el instanceof HTMLElement && !isEditableElement(el) && (!olnlyNotClosed || !closed)) {
    const text = validateHtml(el.innerHTML);
    el.classList.add(EDITABLE_NODE);
    switch (type) {
      case AstNodeType.Code:
        el.innerHTML = `\`${text}${closed ? '`' : ''}`;
        offset = 1;
        break;
      case AstNodeType.Bold:
        el.innerHTML = `**${text}${closed ? '**' : ''}`;
        offset = 2;
        break;
      case AstNodeType.Spoiler:
        el.innerHTML = `||${text}${closed ? '||' : ''}`;
        offset = 2;
        break;
      case AstNodeType.Italic:
        el.innerHTML = `__${text}${closed ? '__' : ''}`;
        offset = 2;
        break;
      case AstNodeType.Strike:
        el.innerHTML = `~~${text}${closed ? '~~' : ''}`;
        offset = 2;
        break;
      case AstNodeType.Underline:
        el.innerHTML = `_${text}${closed ? '_' : ''}`;
        offset = 1;
        break;
      case AstNodeType.Emoji:
        if (el instanceof HTMLImageElement) {
          let href = el.src;
          offset = 1;
          if (el.dataset.documentId) {
            href = `tg://emoji?id=${el.dataset.documentId}`;
          }
          let textContent = el.alt;
          if (!textContent) {
            textContent = EMOJI_KEY;
            offset += EMOJI_KEY.length + 2;
          }
          const html = `[${textContent}](${href})`;
          el.outerHTML = `<code class="${EDITABLE_NODE} ${closed ? NODE_CLOSED : ''}"  data-entity-type='${el.dataset.entityType}'>${html}</code>`;
        }
        break;
      case AstNodeType.Link:
        if (el instanceof HTMLAnchorElement) {
          offset = 1;
          const href = el.dataset.href || el.href;
          let textContent = element?.textContent;
          if (!textContent || href.startsWith(textContent)) {
            textContent = URL_KEY;
            offset += URL_KEY.length + 2;
          }
          const html = `[${textContent}](${href})`;
          el.outerHTML = `<code class="text-entity-code ${EDITABLE_NODE} ${closed ? NODE_CLOSED : ''}"  data-entity-type='${el.dataset.entityType}'>${html}</code>`;
        }
        break;
      case AstNodeType.Pre: {
        el.classList.remove(EDITABLE_NODE);
        offset = 0;
        let html = `\`\`\`${el.dataset.language || ''}\n${el.innerHTML}`;
        if (closed) html += '```';
        const out = `<pre class="CodeBlock code-block ${EDITABLE_NODE} ${closed ? NODE_CLOSED : ''}"  data-entity-type='${ApiMessageEntityTypes.Pre}'>${html}</pre>`;
        extractorEl.innerHTML = out;
        if (el.parentElement?.classList.contains('CodeBlock')) {
          offset += extractorEl.innerText.length - el.parentElement!.innerText.length;
          if (el.isConnected) {
            el.parentElement!.outerHTML = out;
          } else {
            const div = document.createElement('div');
            div.innerHTML = out;
            el.parentElement?.parentElement?.replaceChild(div.firstChild!, el.parentElement);
          }
        } else {
          offset = extractorEl.innerText.length - el.innerText.length;
          el.outerHTML = out;
        }
        offset -= 2;
      }
        break;
      case AstNodeType.Blockquote: {
        let res = '';
        let totalPos = getNodePosition(root, el);
        const arr = text.split('\n');
        const arr2 = el.innerText.split('\n');
        for (let i = 0; i < arr.length; i++) {
          res += `>${arr[i]}\n`;
          if (totalPos <= cursorPos) {
            offset++;
          }
          totalPos += arr2[i].length + 1;
        }
        if (res && res.length > 0) {
          res = res.substring(0, res.length - 1);
        }
        el.innerHTML = res;
      }
    }
  }
  return closed ? offset : 0;
}

export function getCursorOffset(root: HTMLElement, element: Node | undefined, html: string, cursorPos: number, editMode = false) {
  let offset = 0;
  if (element instanceof HTMLElement) {
    extractorEl.innerHTML = html;
    const start = getNodePosition(root, element);
    const end = start + element.innerText.length;
    let type = AST_TYPE_BY_NODE_NAME[element.nodeName];
    let extractorText = extractorEl.innerText;
    if (extractorEl.firstChild) {
      const t = AST_TYPE_BY_NODE_NAME[extractorEl.firstChild.nodeName];
      if (t && t !== AstNodeType.None) {
        type = t;
      }
      if (extractorEl.firstChild.firstChild) {
        extractorText = extractorEl.firstChild.firstChild.textContent!;
      }
    }
    if (cursorPos >= end) {
      offset = element.innerText.length - extractorEl.innerText.length;
      // if (type === AstNodeType.Pre) offset--;
    } else if (cursorPos > start) {
      switch (type) {
        case AstNodeType.Blockquote: {
          let totalPos = start;
          const arr = element.innerText.split('\n');
          for (let i = 0; i < arr.length - 1; i++) {
            if (totalPos <= cursorPos) {
              offset++;
            }
            totalPos += arr[i].length + 1;
          }
        }
          break;
        default: {
          offset = element.innerText.length - extractorEl.innerText.length;
          if (cursorPos < end) {
            if (editMode) {
              offset = cursorPos - start - extractorEl.innerText.length;
            } else {
              const index = element.innerText.indexOf(extractorText);
              if (index >= 0) {
                offset = index;
              } else {
                offset = element.innerText.length - extractorEl.innerText.length;
              }
            }
          }
        }
          break;
      }
    }
  }
  return offset;
}
export function setNotEditable(root: HTMLElement, element: Node | undefined, cursorPos: number) {
  const [el] = getNodeElement(element);
  const els = root.getElementsByClassName(EDITABLE_NODE);
  let offset = 0;
  for (const editable of els) {
    if (editable !== el && editable instanceof HTMLElement && isClosedElement(editable)) {
      const rootNode = parseMarkdownToAst(editable.innerHTML, true);
      const newHtml = renderAst(rootNode, true);
      offset += getCursorOffset(root, editable, newHtml, cursorPos);
      editable.outerHTML = newHtml;
    }
  }
  return offset;
}

export function validateNotClosed(parent: Node) {
  if (parent instanceof HTMLElement && !isClosedElement(parent)) {
    parent.parentElement!.replaceChild(parent.firstChild!, parent);
  }
  for (const child of parent.childNodes) {
    validateNotClosed(child);
  }
}
export function nodeIsClosed(node: AstNode | undefined, closeOnEndText = false) {
  if (node) {
    switch (node.type) {
      case AstNodeType.Code:
        return checkLastChar(node, 3, AstNodeType.Code, 1, closeOnEndText);
      case AstNodeType.Pre:
        return checkLastChar(node, 7, AstNodeType.Code, 3, closeOnEndText);
      case AstNodeType.Bold:
      case AstNodeType.Spoiler:
      case AstNodeType.Italic:
      case AstNodeType.Strike:
        return checkLastChar(node, 5, node.type, 2, closeOnEndText);
      case AstNodeType.Underline:
        return checkLastChar(node, 3, '_', 1, closeOnEndText);
      case AstNodeType.Url: {
        const text = node.getRoot().text;
        if (closeOnEndText && !text[node.endIndex]) return true;
        return text[node.endIndex] !== undefined && !validUrlChars.test(text[node.endIndex]);
      }
      case AstNodeType.Link: {
        const link = node as LinkNode;
        const text = node.getText();
        if (text.length >= 10) {
          return text[0] === '[' && text[text.length - 1] === ')' && link.url !== undefined && link.title !== undefined;
        }
      }
        break;
      case AstNodeType.Blockquote: {
        const text = node.getRoot().text;
        const index = node.endIndex - 1;
        if (closeOnEndText && !text[index + 1]) {
          return true;
        }
        if (text[index + 1] && text[index + 1] !== AstNodeType.Blockquote) {
          return true;
        }
        return false;
      }
    }
  }
  return false;
}

function isLetter(c: string) {
  return c.toLowerCase() !== c.toUpperCase();
}

function parseUrl(parent: BlockNode, node: AstNode | undefined, data: string, index: Ref) {
  if (node && node.type === AstNodeType.Text
    && index.value > 3 && isLetter(data[index.value - 4])
    && (data[index.value - 1] as AstNodeType) === AstNodeType.Slash
  && (data[index.value - 2] as AstNodeType) === AstNodeType.Slash
  && (data[index.value - 3] as AstNodeType) === AstNodeType.Colon) {
    node.endIndex--;
    let charndex = index.value - 4;
    while (charndex >= 0 && isLetter(data[charndex])) {
      node.endIndex--;
      charndex--;
    }
    if (node.isEmpty()) {
      removeNode(parent, node);
    }
    const url = new UrlNode(parent, charndex + 1);
    url.prefix = new AstNode(parent, charndex + 1, AstNodeType.Text);
    url.prefix.endIndex = index.value;

    while (index.value < data.length) {
      const ch = data[index.value];
      if (!validUrlChars.test(ch)) break;
      index.value++;
    }
    url.suffix = new AstNode(parent, url.prefix.endIndex, AstNodeType.Text);
    url.suffix.endIndex = index.value;
    if (url.prefix.getText().toLowerCase() === 'tg://') {
      const text = url.suffix.getText().toLowerCase();
      const idtext = '?id=';
      const i = text.indexOf(idtext);
      if (i !== -1) {
        url.tgType = text.substring(0, i);
        url.tgId = text.substring(i + idtext.length);
      }
    }
    url.endIndex = index.value;
    url.closed = true;
    return url;
  }
  return undefined;
}

function parseLink(parent: BlockNode, data: string, index: Ref) {
  const node = new LinkNode(parent, index.value - 1);
  const start = index.value;
  let exited = false;
  let url: AstNode | undefined;
  while (index.value < data.length) {
    const ch = data[index.value];
    switch (ch) {
      case '\r':
        break;
      case '\n':
        exited = true;
        break;
      case '(':
        if (url || !node.title) {
          exited = true;
        } else {
          url = new AstNode(parent, index.value + 1, AstNodeType.Text);
        }
        break;
      case '/':
        if (!node.url && url) {
          index.value++;
          node.url = parseUrl(parent, url, data, index);
          if (url.isEmpty()) url = undefined;
          continue;
        }
        break;
      case ')':
        if (node.url) {
          node.url.endIndex = index.value;
          node.endIndex = index.value + 1;
          node.closed = true;
          parent.nodes.push(node);
          index.value++;
          return;
        } else {
          exited = true;
        }
        break;
      case ']':
        if (!node.title) {
          node.title = new AstNode(parent, start, AstNodeType.Text);
          node.title.endIndex = index.value;
        } else {
          exited = true;
        }
        break;
      default:
        if (url) {
          url.endIndex = index.value + 1;
        }
        break;
    }
    index.value++;
    if (exited) break;
  }
  if (data.length === index.value) {
    node.endIndex = index.value;
    node.closed = true;
    parent.nodes.push(node);
    return;
  }
  if (node.title) {
    node.title.startIndex = node.startIndex;
    node.title.endIndex = index.value;
    parent.nodes.push(node.title);
  }
  if (url) {
    url.endIndex = index.value;
    parent.nodes.push(url);
  }
}

function parseCode(parent: BlockNode, data: string, index: Ref) {
  let start = index.value - 1;
  while (index.value < data.length) {
    if (data[index.value] === '`') index.value++;
    else break;
  }

  let text: AstNode | undefined;
  if (index.value === data.length) {
    text = new AstNode(parent, start, AstNodeType.Text);
    text.endIndex = index.value;
    parent.nodes.push(text);
    return;
  }
  let textCount = 0;
  let type = AstNodeType.Text;
  const num = index.value - start;
  if (num >= 3 && parent.type === AstNodeType.Root) {
    type = AstNodeType.Pre;
    textCount = num - 3;
  } else if (num >= 1) {
    type = AstNodeType.Code;
    textCount = num - 1;
  }

  if (textCount > 0) {
    text = new AstNode(parent, start, AstNodeType.Text);
    text.endIndex = start + textCount;
    parent.nodes.push(text);
    start += textCount;
  }

  let lang: AstNode | undefined;
  let code: AstNode | undefined;
  let newLine = false;
  while (index.value < data.length) {
    const ch = data[index.value];
    switch (ch) {
      case '\r':
        index.value++;
        continue;
      case '`':
        if ((type === AstNodeType.Code) || (data[index.value - 1] === AstNodeType.Code && data[index.value - 2] === AstNodeType.Code && type === AstNodeType.Pre)) {
          const node = new CodeNode(parent, start, type);
          node.code = code;
          node.lang = lang;
          if (type === AstNodeType.Pre && code) code.endIndex -= 2;
          node.endIndex = index.value + 1;
          node.closed = true;
          index.value = node.endIndex;
          parent.nodes.push(node);
          return;
        }
        break;
      case '\n':
        if (type === AstNodeType.Code) {
          const node = new CodeNode(parent, start, type);
          if (code) code.endIndex = index.value;
          node.code = code;
          node.endIndex = index.value;
          parent.nodes.push(node);
          return;
        }
        newLine = true;
        index.value++;
        continue;
    }
    if (newLine || type === AstNodeType.Code) {
      if (!code) code = new AstNode(parent, index.value, AstNodeType.Text);
      code.endIndex = index.value + 1;
    } else {
      if (!lang) lang = new AstNode(parent, index.value, AstNodeType.Text);
      lang.endIndex = index.value + 1;
    }
    index.value++;
  }

  const nodeExit = new CodeNode(parent, start, type);
  nodeExit.code = type === AstNodeType.Code && !code ? lang : code;
  nodeExit.lang = lang;
  nodeExit.endIndex = index.value;
  parent.nodes.push(nodeExit);
}

function updatePrevNode(parent: BlockNode, node: AstNode | undefined) {
  if (node) {
    node.type = AstNodeType.Text;
    node.endIndex--;
    if (node.isEmpty()) {
      removeNode(parent, node);
    }
  }
}

function parseBlock(parent: BlockNode, block: BlockNode, data: string, index: Ref) {
  const res = parse(block, data, index);
  if (res || parent.getRoot().useClosed) {
    block.endIndex = index.value;
    block.closed = res && nodeIsClosed(block, parent.getRoot().useClosed);
    parent.nodes.push(block);
  } else {
    const node = new AstNode(parent, block.startIndex, AstNodeType.Text);
    node.endIndex += block.type === AstNodeType.Underline ? 1 : 2;
    parent.nodes.push(node);
    for (const n of block.nodes) {
      parent.nodes.push(n);
    }
  }
  return res;
}

function updateDefault(parent: BlockNode, node: AstNode | undefined, i: number) {
  if (!node) {
    node = new AstNode(parent, i - 1, AstNodeType.Text);
    parent.nodes.push(node);
  }
  node.endIndex = i;
  return node;
}

function parse(parent: BlockNode, data: string, index: Ref, retBr: boolean = false) {
  let node: AstNode | undefined;
  let prev = AstNodeType.None;
  while (index.value < data.length) {
    const ch = data[index.value];
    index.value++;

    if (ch === '\r') continue;

    let type = ch as AstNodeType;
    const next = index.value < data.length ? data[index.value] as AstNodeType : AstNodeType.None;

    switch (type) {
      case AstNodeType.Br: {
        const br = new AstNode(parent, index.value - 1, AstNodeType.Br);
        br.endIndex = index.value;
        parent.nodes.push(br);
        node = undefined;
        if (retBr) {
          // index.value--;
          return true;
        }
      }
        break;
      case AstNodeType.Link:
        node = undefined;
        parseLink(parent, data, index);
        break;
      case AstNodeType.Slash: {
        const url = parseUrl(parent, node, data, index);
        if (url) {
          parent.nodes.push(url);
          node = undefined;
        }
      }
        break;
      case AstNodeType.Bold:
      case AstNodeType.Italic:
      case AstNodeType.Spoiler:
      case AstNodeType.Strike:
        if (node && node.type === AstNodeType.Pre) {
          node = updateDefault(parent, node, index.value);
          break;
        }
        if (parent.type === type && next === type) {
          index.value++;
          parent.endIndex = index.value;
          return true;
        }
        if (parent.type === AstNodeType.Underline && type === AstNodeType.Italic && prev !== type) {
          parent.endIndex = index.value;
          return true;
        }

        if (parent.type !== type && prev === type) {
          if (parent.getNotClosed(type)) {
            index.value -= 2;
            updatePrevNode(parent, node);
            return false;
          }
        }
        if (parent.type !== type && prev === type && next !== type) {
          updatePrevNode(parent, node);
          const block = new BlockNode(parent, index.value - 2, type);
          parseBlock(parent, block, data, index);
          node = undefined;
          type = AstNodeType.None;
        } else if (type === AstNodeType.Italic && next !== type) {
          if (parent.type === AstNodeType.Underline) return true;
          if (parent.getNotClosed(AstNodeType.Underline)) return false;
          const block = new BlockNode(parent, index.value - 1, AstNodeType.Underline);
          parseBlock(parent, block, data, index);
          type = AstNodeType.None;
          node = undefined;
        } else {
          node = updateDefault(parent, node, index.value);
          break;
        }
        break;
      case AstNodeType.Blockquote:
        prev = index.value > 1 ? data[index.value - 2] as AstNodeType : AstNodeType.None;
        if ((!node || node.type !== AstNodeType.Blockquote) && prev !== AstNodeType.None && prev !== AstNodeType.Br && prev !== AstNodeType.R) {
          node = updateDefault(parent, node, index.value);
          break;
        } else {
          if (parent.type !== AstNodeType.Root) {
            index.value--;
            if (data[index.value] === AstNodeType.Blockquote) {
              node = parent.lastNode();
              if (node && node.type === AstNodeType.Br) {
                removeNode(parent, node);
                index.value--;
              }
            }
            return true;
          }
          if (!node || node.type !== AstNodeType.Blockquote) {
            node = new BlockNode(parent, index.value - 1, type);
            parent.nodes.push(node);
          }
          if (node.type === AstNodeType.Blockquote) {
            parse(node as BlockNode, data, index, true);
            node.endIndex = index.value;
            if (data[index.value] && data[index.value] !== AstNodeType.Blockquote) {
              const block = node as BlockNode;
              node = block.lastNode();
              if (node && node.type === AstNodeType.Br) {
                removeNode(block, node);
                parent.nodes.push(node);
                block.endIndex--;
              }
              block.closed = true;
              node = undefined;
            }
          }
        }
        break;
      case AstNodeType.Code:
        node = undefined;
        parseCode(parent, data, index);
        break;
      default:
        node = updateDefault(parent, node, index.value);
        break;
    }
    prev = type;
    if (node instanceof BlockNode && !node.closed) {
      node.closed = nodeIsClosed(node, node.getRoot().useClosed);
    }
  }
  return parent.isClosed() || index.value === data.length;
}

export function parseMarkdownToAst(data: string, useClosed = false) {
  if (isHtml(data)) {
    data = htmlToMarkdown(data, TG_TAGS);
  }
  const ref = { value: 0 } as Ref;
  const root = new RootNode(data, useClosed);
  parse(root, data, ref);
  return root;
}

function nodeTypeToEntry(type: AstNodeType) {
  switch (type) {
    case AstNodeType.Bold: return ApiMessageEntityTypes.Bold;
    case AstNodeType.Italic: return ApiMessageEntityTypes.Italic;
    case AstNodeType.Underline: return ApiMessageEntityTypes.Underline;
    case AstNodeType.Strike: return ApiMessageEntityTypes.Strike;
    case AstNodeType.Blockquote: return ApiMessageEntityTypes.Blockquote;
    case AstNodeType.Pre: return ApiMessageEntityTypes.Pre;
    case AstNodeType.Code: return ApiMessageEntityTypes.Code;
    case AstNodeType.Spoiler: return ApiMessageEntityTypes.Spoiler;
  }
  return ApiMessageEntityTypes.Unknown;
}
function createParentEntries(node: AstNode, entities: ApiMessageEntity[], index: Ref) {
  const parent = node.parent!;
  if (!parent.isRoot() && !parent.entity) {
    createParentEntries(parent, entities, index);
    const entity: ApiMessageEntity = { type: nodeTypeToEntry(parent.type), offset: index.value, length: 0 };
    parent.entity = entity;
    entities.push(entity);
  }
}
function astToString(node: AstNode, entities: ApiMessageEntity[], index: Ref):[string, boolean] {
  let text = '';
  let nodeText = '';
  let valid = true;
  switch (node.type) {
    case AstNodeType.Text:
    case AstNodeType.Br:
      createParentEntries(node, entities, index);
      if (!node.parent?.isRoot() && !node.parent!.closed) {
        nodeText = node.parent?.getText() || '';
        valid = false;
      } else {
        nodeText = node.getText();
      }
      break;
    case AstNodeType.Pre: {
      const codeNode = node as CodeNode;
      if (codeNode.closed) {
        nodeText = `${codeNode.code?.getText() || ''}`;
      } else {
        valid = false;
        nodeText = codeNode.getText();
      }
      const entity: ApiMessageEntityPre = {
        type: ApiMessageEntityTypes.Pre, offset: index.value, length: nodeText.length, language: codeNode.lang?.getText(),
      };
      entities.push(entity);
    }
      break;
    case AstNodeType.Code: {
      const codeNode = node as CodeNode;
      if (codeNode.closed) {
        nodeText = `${codeNode.code?.getText() || ''}`;
      } else {
        valid = false;
        nodeText = codeNode.getText();
      }
      const entity: ApiMessageEntity = { type: ApiMessageEntityTypes.Code, offset: index.value, length: nodeText.length };
      entities.push(entity);
    }
      break;
    case AstNodeType.Link:
    case AstNodeType.Url:
      if (node.closed) {
        let url: UrlNode | undefined = node as UrlNode;
        nodeText = '';
        if (node instanceof LinkNode) {
          nodeText = `${node.title?.getText() || ''}`;
          if (nodeText === URL_KEY) nodeText = '';
          url = node.url;
        }
        const type = url?.getEntryType() || ApiMessageEntityTypes.TextUrl;
        switch (type) {
          case ApiMessageEntityTypes.TextUrl: {
            const entity: ApiMessageEntityTextUrl = {
              type, offset: index.value, length: nodeText.length, url: url?.getText() || '',
            };
            entities.push(entity);
          }
            break;
          case ApiMessageEntityTypes.MentionName: {
            const entity: ApiMessageEntityMentionName = {
              type, offset: index.value, length: nodeText.length, userId: url?.tgId || '',
            };
            entities.push(entity);
          }
            break;
          case ApiMessageEntityTypes.CustomEmoji: {
            const entity: ApiMessageEntityCustomEmoji = {
              type, offset: index.value, length: nodeText.length, documentId: url?.tgId || '',
            };
            entities.push(entity);
          }
            break;
        }
      } else {
        valid = false;
        nodeText = node.getText();
      }
      break;
    case AstNodeType.Root:
      break;
    default:
      if (node instanceof BlockNode) {
        if ((node as BlockNode).nodes.length === 0) {
          nodeText = node.getText();
        }
      }
      break;
  }

  text += nodeText;
  index.value += nodeText.length;

  if (node instanceof BlockNode) {
    const parent = node as BlockNode;
    for (const child of parent.nodes) {
      const [t, v] = astToString(child, entities, index);
      text += t;
      if (!v) break;
    }
    if (parent.type !== AstNodeType.Root && parent.entity) parent.entity.length = index.value - parent.entity.offset;
  }
  return [text, valid];
}

export function parseRootNodeToEntries(root: RootNode) : [string, ApiMessageEntity[]] {
  const entities: ApiMessageEntity[] = [];
  const index = { value: 0 } as Ref;
  const [text] = astToString(root, entities, index);
  return [text, entities];
}
export function parseMarkdownToEntries(html: string) : [string, ApiMessageEntity[]] {
  const root = parseMarkdownToAst(html);
  return parseRootNodeToEntries(root);
}

export function renderAst(root: BlockNode, allClosed = false, closeOnEndText = false) {
  let out : string = '';
  for (const node of root.nodes) {
    let html = '';
    const nodeClosed = node.closed;
    const blockClosed = allClosed || nodeClosed;
    if (node instanceof BlockNode) {
      if (blockClosed) {
        html = renderAst(node, allClosed, closeOnEndText);
      } else {
        html = node.getText();
      }
    }
    const nodeClassName = `${!blockClosed ? ` ${EDITABLE_NODE}` : ''} ${nodeClosed ? NODE_CLOSED : ''}`;
    const nodeClass = !blockClosed || nodeClosed ? ` class="${nodeClassName.trim()}"` : '';

    switch (node.type) {
      case AstNodeType.Text:
        out += node.getText();
        break;
      case AstNodeType.Br:
        out += '\n';
        break;
      case AstNodeType.Pre: {
        const codeNode = node as CodeNode;
        if (nodeClosed) {
          html = codeNode.code?.getText() || '';
          out += `${codeBlockHtml(html, nodeClassName, codeNode.lang?.getText())}`;
        } else {
          html = codeNode.getText();
          out += `<pre class="CodeBlock code-block${nodeClassName} ${EDITABLE_NODE}" data-entity-type="${ApiMessageEntityTypes.Pre}" data-language="${codeNode.lang?.getText() || ''}">${html}</pre>`;
        }
      }
        break;
      case AstNodeType.Code: {
        const codeNode = node as CodeNode;
        if (blockClosed) {
          html = codeNode.code?.getText() || '';
        } else {
          html = codeNode.getText();
        }
        out += `<code class="text-entity-code${nodeClassName}" data-entity-type="${ApiMessageEntityTypes.Code}">${html}</code>`;
      }
        break;
      case AstNodeType.Url:
      case AstNodeType.Link: {
        if (!blockClosed) {
          out += `<code${nodeClass} data-entity-type="${ApiMessageEntityTypes.TextUrl}">${node.getText()}</code>`;
          continue;
        }
        let url: UrlNode = node as UrlNode;
        let title: string | undefined = '';
        if (node instanceof LinkNode) {
          url = node.url!;
          title = node.title?.getText() || '';
          if (title === URL_KEY) title = '';
        }

        const href = url?.getText() || '';
        const type = url?.getEntryType() || ApiMessageEntityTypes.TextUrl;
        switch (type) {
          case ApiMessageEntityTypes.CustomEmoji: {
            const entity: ApiMessageEntityCustomEmoji = {
              type: ApiMessageEntityTypes.CustomEmoji, offset: 0, length: title!.length, documentId: url.tgId!,
            };
            out += buildCustomEmojiHtmlFromEntity(title, entity, nodeClassName);
          }
            break;
          case ApiMessageEntityTypes.MentionName:
            out += `<a class="text-entity-link${nodeClassName}" data-entity-type="${ApiMessageEntityTypes.MentionName}" data-user-id="${url!.tgId}" contenteditable="false" dir="auto" data-href="${href}">${title || href}</a>`;
            break;
          case ApiMessageEntityTypes.TextUrl:
            out += `<a class="text-entity-link${nodeClassName}" href="${href}" data-entity-type="${type}" dir="auto" >${title || href}</a>`;
            break;
        }
      }
        break;
      case AstNodeType.Bold:
        out += `<b${nodeClass}>${html}</b>`;
        break;
      case AstNodeType.Italic:
        out += `<i${nodeClass}>${html}</i>`;
        break;
      case AstNodeType.Strike:
        out += `<strike${nodeClass}>${html}</strike>`;
        break;
      case AstNodeType.Underline:
        out += `<u${nodeClass}>${html}</u>`;
        break;
      case AstNodeType.Spoiler:
        out += `<span class="spoiler${nodeClassName}" data-entity-type="${ApiMessageEntityTypes.Spoiler}">${html}</span>`;
        break;
      case AstNodeType.Blockquote:
        out += `<blockquote${nodeClass}>${html}</blockquote>`;
        break;
    }
  }
  return out;
}

export function parseMarkdownToHtml(data: string) {
  return renderAst(parseMarkdownToAst(data));
}
