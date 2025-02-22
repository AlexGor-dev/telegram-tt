import type { Rule, RuleTop } from './astBuilder';

import { RuleType } from './astBuilder';

let defaultMarkdownRules: Rule[];
let tgMarkdownRules: Rule[];

export function getDefaultMarkdownRules() {
  if (!defaultMarkdownRules) {
    defaultMarkdownRules = [];

    defaultMarkdownRules.push({ type: RuleType.newLine, reg: /^\n+/ });
    defaultMarkdownRules.push({ type: RuleType.space, reg: /^\n+/ });
    defaultMarkdownRules.push({ type: RuleType.br, reg: /^ {2,}\n(?!\s*$)/ });

    // defaultMarkdownRules.push({ type: RuleType.code, reg: /^( {4}[^\n]+\n*)+/ });
    defaultMarkdownRules.push({ type: RuleType.fences, reg: /^ *(`{3,}|~{3,}) *(?<lang>\S+)? *\n(?<code>[\s\S]+?)\s*\1 *(?:\n+|$)/ });
    defaultMarkdownRules.push({ type: RuleType.monospace, reg: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/ });

    defaultMarkdownRules.push({ type: RuleType.heading, reg: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/ });
    defaultMarkdownRules.push({ type: RuleType.npTable, useTop: true, reg: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/ } as RuleTop);
    defaultMarkdownRules.push({ type: RuleType.lheading, reg: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/ });
    defaultMarkdownRules.push({ type: RuleType.hr, reg: /^( *[-*_]){3,} *(?:\n+|$)/ });
    defaultMarkdownRules.push({ type: RuleType.blockquote, reg: /^( *>[^\n]+(\n(?! *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +[''(]([^\n]+)['')])? *(?:\n+|$))[^\n]+)*\n*)+/ });
    defaultMarkdownRules.push({ type: RuleType.list, reg: /^( *)((?:[*+-]|\d+\.)) [\s\S]+?(?:\n+(?=\1?(?:[-*_] *){3,}(?:\n+|$))|\n+(?= *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +[''(]([^\n]+)['')])? *(?:\n+|$))|\n{2,}(?! )(?!\1(?:[*+-]|\d+\.) )\n*|\s*$)/ });
    defaultMarkdownRules.push({ type: RuleType.html, reg: /^ *(?:<!--[\s\S]*?-->|<((?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\b)\w+(?!:\/|[^\w\s@]*@)\b)[\s\S]+?<\/\1>|<(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\b)\w+(?!:\/|[^\w\s@]*@)\b(?:""[^""]*""|'[^']*'|[^'"">])*?>) *(?:\n{2,}|\s*$)/m });
    defaultMarkdownRules.push({ type: RuleType.def, useTop: true, reg: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +[''(]([^\n]+)['')])? *(?:\n+|$)/ } as RuleTop);
    defaultMarkdownRules.push({ type: RuleType.table, useTop: true, reg: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/ } as RuleTop);

    defaultMarkdownRules.push({ type: RuleType.escape, reg: /^\\([\\`*{}\\[\]()#+\-.!_>~|])/ });

    defaultMarkdownRules.push({ type: RuleType.image, reg: /^!\[(?<altText>.*)\]\((?<href>.*?)\s*("(?<title>.*[^"])")?\s*\)/ });
    defaultMarkdownRules.push({ type: RuleType.autoLink, reg: /^<([^ >]+(@|:\/)[^ >]+)>/ });
    defaultMarkdownRules.push({ type: RuleType.emoji, reg: /(:-\)|:-\(|8-\)|;\)|:wink:|:cry:|:laughing:|:yum:)/g });
    defaultMarkdownRules.push({ type: RuleType.url, reg: /^(https?:\/\/[^\s<]+[^<.,:;""')\]\s])/ });
    defaultMarkdownRules.push({ type: RuleType.link, reg: /^\[([^\]]*)\]\(([^)]*)\)/ });
    defaultMarkdownRules.push({ type: RuleType.refLink, reg: /^!?\[((?:\[[^\]]*\]|[^\\[\]]|\](?=[^\\[]*\]))*)\]\s*\[([^\]]*)\]/ });
    defaultMarkdownRules.push({ type: RuleType.idLink, reg: /^\[(?<id>.*)\]:\s*(?<href>\S*)\s*("(?<title>.*[^"])")?\s*/ });

    defaultMarkdownRules.push({ type: RuleType.tag, reg: /^<!--[\s\S]*?-->|^<\/?\w+(?:""[^""]*""|'[^']*'|[^'"">])*?>/ });

    defaultMarkdownRules.push({ type: RuleType.bold, reg: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/ });
    defaultMarkdownRules.push({ type: RuleType.italic, reg: /^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/ });

    defaultMarkdownRules.push({ type: RuleType.strike, reg: /^~~(?=\S)([\s\S]*?\S)~~/ });
    defaultMarkdownRules.push({ type: RuleType.mark, reg: /^==(?=\S)([\s\S]*?\S)==/ });
    defaultMarkdownRules.push({ type: RuleType.underline, reg: /^\+\+(?=\S)([\s\S]*?\S)\+\+/ });
    defaultMarkdownRules.push({ type: RuleType.sub, reg: /^~(?=\S)([\s\S]*?\S)~/ });
    defaultMarkdownRules.push({ type: RuleType.sup, reg: /^\^(?=\S)([\s\S]*?\S)\^/ });

    defaultMarkdownRules.push({ type: RuleType.paragraph, useTop: true, reg: /^((?:[^\n]+\n?(?! *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\\2 *(?:\n+|$)|( *)((?:[*+-]|\d+\.)) [\s\S]+?(?:\n+(?=\\3?(?:[-*_] *){3,}(?:\n+|$))|\n+(?= *\[([^\]]+)\\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))|\n{2,}(?! )(?!\\1(?:[*+-]|\d+\.) )\n*|\s*$)|( *[-*_]){3,} *(?:\n+|$)| *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)|([^\n]+)\n *([=|-]){2,} *(?:\n+|$)|( *>[^\n]+(\n(?! *\[([^\]]+)\\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))[^\n]+)*\n*)+|<(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\b)\w+(?!:\/|[^\w\s@]*@)\b| *\[([^\]]+)\\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)))+)\n*/ } as RuleTop);

    defaultMarkdownRules.push({ type: RuleType.textInline, reg: /^[\s\S]+?(?=[\\<!\\[_*`~^]|https?:\/\/| {2,}\n|$)/ });
    defaultMarkdownRules.push({ type: RuleType.text, reg: /^[^\n]+/ });
  }
  return defaultMarkdownRules;
}

export function getTgMarkdownRules() {
  if (!tgMarkdownRules) {
    tgMarkdownRules = [];

    tgMarkdownRules.push({ type: RuleType.newLine, reg: /^\n+/ });
    // tgMarkdownRules.push({ type: RuleType.html, reg: /^<\s*(\w+)[^>]*>((\s*(\w+)[^>]*)|(.*))<\/\s*(\w+)[^/>]*>/ });

    // tgMarkdownRules.push({ type: RuleType.code, reg: /^( {4}[^\n]+\n*)+/ });
    tgMarkdownRules.push({ type: RuleType.fences, reg: /^ *(`{3,}|~{3,}) *(?<lang>\S+)? *\n(?<code>[\s\S]+?)\s*\1 *(?:\n+|$)/ });
    tgMarkdownRules.push({ type: RuleType.monospace, reg: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/ });

    // tgMarkdownRules.push({ type: RuleType.blockquoteInline, reg: /^>>(.*)<</ });
    tgMarkdownRules.push({ type: RuleType.blockquote, reg: /^(> ?.+\n*)+ ?/ });


    tgMarkdownRules.push({ type: RuleType.image, reg: /^!\[(?<altText>.*)\]\((?<href>.*?)\s*("(?<title>.*[^"])")?\s*\)/ });
    tgMarkdownRules.push({ type: RuleType.link, reg: /^\[([^\]]*)\]\(([^)]*)\)/ });

    tgMarkdownRules.push({ type: RuleType.bold, reg: /^\*\*(.*)\*\*/ });
    tgMarkdownRules.push({ type: RuleType.strike, reg: /^~~(?=\S)([\s\S]*?\S)~~/ });
    tgMarkdownRules.push({ type: RuleType.italic, reg: /^__(.*)__/ });
    tgMarkdownRules.push({ type: RuleType.underline, reg: /^_(.*)_/ });
    tgMarkdownRules.push({ type: RuleType.spoiler, reg: /^\|\|(.*)\|\|/m });

    tgMarkdownRules.push({ type: RuleType.textInline, reg: /^[\s\S]+?(?=[\\<!\\[>>|_*`~^]|https?:\/\/| {2,}\n|$)/m });

    tgMarkdownRules.push({ type: RuleType.text, reg: /^[^\n]+/ });
  }
  return tgMarkdownRules;
}
