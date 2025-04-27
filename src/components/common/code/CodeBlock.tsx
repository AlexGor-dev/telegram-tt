import type { FC, TeactNode, VirtualElement } from '../../../lib/teact/teact';
import React, { memo, useCallback, useState } from '../../../lib/teact/teact';
import TeactDOM from '../../../lib/teact/teact-dom';

import { ApiMessageEntityTypes } from '../../../api/types';

import buildClassName from '../../../util/buildClassName';
import highlightCode, {highlightCodeSync} from '../../../util/highlightCode';
import { getPrettyCodeLanguageName } from '../../../util/prettyCodeLanguageNames';

import useAsync from '../../../hooks/useAsync';

import PeerColorWrapper from '../PeerColorWrapper';
import CodeOverlay from './CodeOverlay';

import './CodeBlock.scss';

export type OwnProps = {
  text: string;
  language?: string;
  className?: string;
  noCopy?: boolean;
  highlightedNode?: TeactNode;
};

const CodeBlock: FC<OwnProps> = ({ text, highlightedNode, className, language, noCopy }) => {
  const [isWordWrap, setWordWrap] = useState(true);

  const { result: highlighted } = useAsync(() => {
    if (!language) return Promise.resolve(undefined);
    return import('../../../util/highlightCode')
      .then((lib) => lib.default(text, language));
  }, [language, text]);

  const handleWordWrapToggle = useCallback((wrap) => {
    setWordWrap(wrap);
  }, []);

  const blockClass = buildClassName(
    'code-block',
    !isWordWrap && 'no-word-wrap',
    className,
  );

  return (
    <PeerColorWrapper
      className="CodeBlock"
    >
      {language && (<p className="code-title">{getPrettyCodeLanguageName(language)}</p>)}
      <pre className={blockClass} data-entity-type={ApiMessageEntityTypes.Pre} data-language={language}>
        {highlightedNode ?? highlighted ?? text}
        <CodeOverlay
          text={text}
          className="code-overlay"
          onWordWrapToggle={handleWordWrapToggle}
          noCopy={noCopy}
        />
      </pre>
    </PeerColorWrapper>
  );
};

export default memo(CodeBlock);

export function codeBlockHtml(html: string, className: string, lang?: string) {
  const fragment = document.createElement('div');
  html = html.replace(/<br>/g, '\n');
  let node : TeactNode | undefined;
  if (lang) {
    node = highlightCodeSync(html, lang);
  }
  TeactDOM.render(<CodeBlock text={html} highlightedNode={node} language={lang} className={className} noCopy />, fragment);
  return fragment.innerHTML;
}
