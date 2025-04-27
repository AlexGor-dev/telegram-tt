import { ApiMessageEntityTypes } from '../../api/types';

import { isEditableElement } from './markdownParser';

// const htmlReg = /<\s*(\w+)[^>]*>((\s*(\w+)[^>]*)|(.*))<\/\s*(\w+)[^/>]*>/gm;

const fragment = document.createElement('div');
export function isHtml(html: string) : boolean {
  fragment.innerHTML = html;
  return fragment.innerHTML !== fragment.innerText;
}
export const TG_TAGS: Record<string, string> = {
  B: '**#text#**',
  STRONG: '**#text#**',
  I: '__#text#__',
  EM: '__#text#__',
  INS: '_#text#_',
  U: '_#text#_',
  S: '~~#text#~~',
  STRIKE: '~~#text#~~',
  DEL: '~~#text#~~',
  CODE: '`#text#`',
  Pre_Code: '```#language#\n#text#\n```\n',
  Blockquote_Newline: '>#text#',
  Blockquote_Inline: '>>#text#<<',
  Link: '[#text#](#url#)',
  Spoiler: '||#text#||',
  CodeTitle: 'code-title',
};
export function validateHtml(html: string) {
  html = html.replace(/&gt;/g, '>').replace(/&lt;/g, '<');
  html = html.replace(/&nbsp;/g, ' ');
  // Replace <div><br></div> with newline (new line in Safari)
  html = html.replace(/<div><br([^>]*)?><\/div>/g, '\n');
  html = html.replace(/<br([^>]*)?>/g, '\n');
  return html;
}
export function htmlToMarkdown(html: string, map: Record<string, string>, ignoryTagPos: number = -1) {
  html = validateHtml(html);
  let result = '';
  let position = 0;
  fragment.innerHTML = html;

  function addNode(node: ChildNode) {
    if (node.nodeName === '#text') {
      return node.textContent;
    }
    let textContent = '';
    for (const child of node.childNodes) {
      textContent += addNode(child);
      position += textContent.length;
    }
    if (ignoryTagPos !== -1 && position >= ignoryTagPos) {
      return textContent;
    }
    if (node instanceof HTMLElement && !isEditableElement(node)) {
      switch (node.nodeName) {
        case 'BLOCKQUOTE': {
          const split = textContent.split(/\n/g);
          if (split.length > 1) {
            textContent = '';
            for (const line of split) {
              if (line) textContent += `${map.Blockquote_Newline.replace('#text#', line)}\n`;
            }
            return textContent;
          } else {
            return `${map.Blockquote_Inline.replace('#text#', split[0])}`;
          }
        }
          break;
        case 'A': {
          const a = node as HTMLAnchorElement;
          let href = a.dataset.href || a.href;
          if (!href && a.dataset.userId) {
            href = `tg://emoji?id=${a.dataset.userId}`;
          }
          if (!textContent) {
            return href;
            // for (const img of node.childNodes) {
            //   if (img instanceof HTMLImageElement && img.alt) {
            //     textContent = img.alt;
            //     break;
            //   }
            // }
          }
          return map.Link.replace('#text#', textContent).replace('#url#', href);
        }
          break;
        case 'IMG': {
          const img = node as HTMLImageElement;
          let href = img.src;
          if (img.dataset.documentId) {
            href = `tg://emoji?id=${img.dataset.documentId}`;
          }
          if (!img.alt) return href;
          return map.Link.replace('#text#', img.alt).replace('#url#', href);
        }
          break;
        case 'SPAN':
          if (node.dataset.entityType === ApiMessageEntityTypes.Spoiler) {
            return map.Spoiler.replace('#text#', textContent);
          }
          break;
        case 'PRE':
          if (node instanceof HTMLPreElement) {
            if (result && result.charAt(result.length - 1) !== '\n') {
              textContent += '\n';
            }
            return map.Pre_Code.replace('#text#', textContent).replace('#language#', node.dataset.language || '');
          }
          break;
        case 'P':
          if (node.classList.contains(map.CodeTitle)) {
            textContent = '';
          }
          break;
        case 'CODE':
          if (node.dataset.entityType === ApiMessageEntityTypes.Code) {
            return map.CODE.replace('#text#', textContent);
          }
          break;
        case 'BR':
          return `${textContent}\n`;
        default: {
          const p = map[node.nodeName];
          if (p) {
            return p.replace('#text#', textContent);
          }
        }
          break;
      }
    }
    return textContent;
  }
  for (const node of fragment.childNodes) {
    result += addNode(node);
  }
  return result;
}
