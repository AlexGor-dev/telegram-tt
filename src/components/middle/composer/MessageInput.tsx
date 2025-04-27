import type {ChangeEvent, RefObject} from 'react';
import type {FC} from '../../../lib/teact/teact';
import React, {getIsHeavyAnimating, memo, useCallback, useEffect, useLayoutEffect, useRef, useState,} from '../../../lib/teact/teact';
import {getActions, withGlobal} from '../../../global';

import type {ApiInputMessageReplyInfo} from '../../../api/types';
import type {IAnchorPosition, ISettings, ThreadId} from '../../../types';
import type {Signal} from '../../../util/signals';
import type {UndoManager} from '../../../util/UndoManager';

import {EDITABLE_INPUT_ID} from '../../../config';
import {requestForcedReflow, requestMutation} from '../../../lib/fasterdom/fasterdom';
import {selectCanPlayAnimatedEmojis, selectDraft, selectIsInSelectMode} from '../../../global/selectors';
import buildClassName from '../../../util/buildClassName';
import captureKeyboardListeners from '../../../util/captureKeyboardListeners';
import {getIsDirectTextInputDisabled} from '../../../util/directInputManager';
import parseEmojiOnlyString from '../../../util/emoji/parseEmojiOnlyString';
import focusEditableElement from '../../../util/focusEditableElement';
import {htmlToMarkdown, isHtml, TG_TAGS,} from '../../../util/markdown/htmlToMarkdown';
import {
  AST_TYPE_BY_NODE_NAME,
  AstNodeType,
  getClosedElement,
  getCursorOffset,
  isClosedElement,
  isEditableElement,
  parseMarkdownToAst,
  renderAst,
  setEditableNode,
  setEditableNodes,
  setNotClosedNodes,
  setNotEditable,
  validateNotClosed,
} from '../../../util/markdown/markdownParser';
import {debounce} from '../../../util/schedulers';
import {
  getCaretPosition,
  getCaretPositionEnd,
  getNextNewline,
  getPrevNewline,
  getSelectedElement,
  getSelectedText,
  getSelectedText2,
  getSelectionRangePosition,
  setMinCaretPosition,
  setSelectionRangePosition,
} from '../../../util/selection';
import {IS_ANDROID, IS_EMOJI_SUPPORTED, IS_IOS, IS_TOUCH_ENV,} from '../../../util/windowEnvironment';
import renderText from '../../common/helpers/renderText';
import {isSelectionInsideInput} from './helpers/selection';

import useAppLayout from '../../../hooks/useAppLayout';
import useDerivedState from '../../../hooks/useDerivedState';
import useFlag from '../../../hooks/useFlag';
import useLastCallback from '../../../hooks/useLastCallback';
import useOldLang from '../../../hooks/useOldLang';
import useInputCustomEmojis from './hooks/useInputCustomEmojis';

import Icon from '../../common/icons/Icon';
import Button from '../../ui/Button';
import TextTimer from '../../ui/TextTimer';
import TextFormatter from './TextFormatter.async';

const CONTEXT_MENU_CLOSE_DELAY_MS = 100;
// Focus slows down animation, also it breaks transition layout in Chrome
const FOCUS_DELAY_MS = 350;
const TRANSITION_DURATION_FACTOR = 50;

const SCROLLER_CLASS = 'input-scroller';
const INPUT_WRAPPER_CLASS = 'message-input-wrapper';

type OwnProps = {
  ref?: RefObject<HTMLDivElement>;
  id: string;
  chatId: string;
  threadId: ThreadId;
  isAttachmentModalInput?: boolean;
  isStoryInput?: boolean;
  customEmojiPrefix: string;
  editableInputId?: string;
  isReady: boolean;
  isActive: boolean;
  getHtml: Signal<string>;
  placeholder: string;
  timedPlaceholderLangKey?: string;
  timedPlaceholderDate?: number;
  forcedPlaceholder?: string;
  noFocusInterception?: boolean;
  canAutoFocus: boolean;
  shouldSuppressFocus?: boolean;
  shouldSuppressTextFormatter?: boolean;
  canSendPlainText?: boolean;
  onUpdate: (html: string) => void;
  onSuppressedFocus?: () => void;
  onSend: () => void;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
  captionLimit?: number;
  onFocus?: NoneToVoidFunction;
  onBlur?: NoneToVoidFunction;
  isNeedPremium?: boolean;
  undoManager?: UndoManager;
};

type StateProps = {
  replyInfo?: ApiInputMessageReplyInfo;
  isSelectModeActive?: boolean;
  messageSendKeyCombo?: ISettings['messageSendKeyCombo'];
  canPlayAnimatedEmojis: boolean;
};

const MAX_ATTACHMENT_MODAL_INPUT_HEIGHT = 160;
const MAX_STORY_MODAL_INPUT_HEIGHT = 128;
const TAB_INDEX_PRIORITY_TIMEOUT = 2000;
// Heuristics allowing the user to make a triple click
const SELECTION_RECALCULATE_DELAY_MS = 260;
const TEXT_FORMATTER_SAFE_AREA_PX = 140;
// For some reason Safari inserts `<br>` after user removes text from input
const SAFARI_BR = '<br>';
const IGNORE_KEYS = [
  'Esc', 'Escape', 'Enter', 'PageUp', 'PageDown', 'Meta', 'Alt', 'Ctrl', 'ArrowDown', 'ArrowUp', 'Control', 'Shift',
];

export function getInputScroller(input: HTMLDivElement | null) {
  return input!.closest<HTMLDivElement>(`.${SCROLLER_CLASS}`);
}
const MessageInput: FC<OwnProps & StateProps> = ({
  ref,
  id,
  chatId,
  captionLimit,
  isAttachmentModalInput,
  isStoryInput,
  customEmojiPrefix,
  editableInputId,
  isReady,
  isActive,
  getHtml,
  placeholder,
  timedPlaceholderLangKey,
  timedPlaceholderDate,
  forcedPlaceholder,
  canSendPlainText,
  canAutoFocus,
  noFocusInterception,
  shouldSuppressFocus,
  shouldSuppressTextFormatter,
  replyInfo,
  isSelectModeActive,
  canPlayAnimatedEmojis,
  messageSendKeyCombo,
  onUpdate,
  onSuppressedFocus,
  onSend,
  onScroll,
  onFocus,
  onBlur,
  isNeedPremium,
  undoManager,
}) => {
  const {
    editLastMessage,
    replyToNextMessage,
    showAllowedMessageTypesNotification,
    openPremiumModal,
  } = getActions();

  // eslint-disable-next-line no-null/no-null
  let inputRef = useRef<HTMLDivElement>(null);
  if (ref) {
    inputRef = ref;
  }

  // eslint-disable-next-line no-null/no-null
  const selectionTimeoutRef = useRef<number>(null);
  // eslint-disable-next-line no-null/no-null
  const cloneRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const scrollerCloneRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const sharedCanvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line no-null/no-null
  const sharedCanvasHqRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line no-null/no-null
  const absoluteContainerRef = useRef<HTMLDivElement>(null);
  const lastCursorPositionRef = useRef<number>(-1);
  const lastSelectionPosRef = useRef<number>(-1);

  const lang = useOldLang();
  const isContextMenuOpenRef = useRef(false);
  const [isTextFormatterOpen, openTextFormatter, closeTextFormatter] = useFlag();
  const [textFormatterAnchorPosition, setTextFormatterAnchorPosition] = useState<IAnchorPosition>();
  const [selectedRange, setSelectedRange] = useState<Range>();
  const [isTextFormatterDisabled, setIsTextFormatterDisabled] = useState<boolean>(false);
  const { isMobile } = useAppLayout();
  const isMobileDevice = isMobile && (IS_IOS || IS_ANDROID);

  // const [lastCursorPosition, setCursorPosition] = useState(-1);

  const [shouldDisplayTimer, setShouldDisplayTimer] = useState(false);

  function clearSelection() {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    if (undoManager && inputRef.current && selection.rangeCount > 0) {
      undoManager.add(inputRef.current.innerHTML, 0, 0);
    }
    if (selection.removeAllRanges) {
      selection.removeAllRanges();
    } else if (selection.empty) {
      selection.empty();
    }
  }

  function setCursorPosition(pos: number) {
    if (lastCursorPositionRef) {
      lastCursorPositionRef.current = pos;
    }
  }
  function setCursorPositionFromLast() {
    if (lastCursorPositionRef) {
      const pos = lastCursorPositionRef.current;
      if (pos !== -1 && getSelectedText2().length === 0) {
        setMinCaretPosition(inputRef.current!, pos);
      }
    }
  }
  useEffect(() => {
    setShouldDisplayTimer(Boolean(timedPlaceholderLangKey && timedPlaceholderDate));
  }, [timedPlaceholderDate, timedPlaceholderLangKey]);

  const handleTimerEnd = useLastCallback(() => {
    setShouldDisplayTimer(false);
  });

  useInputCustomEmojis(
    getHtml,
    inputRef,
    sharedCanvasRef,
    sharedCanvasHqRef,
    absoluteContainerRef,
    customEmojiPrefix,
    canPlayAnimatedEmojis,
    isReady,
    isActive,
  );

  const maxInputHeight = isAttachmentModalInput
    ? MAX_ATTACHMENT_MODAL_INPUT_HEIGHT
    : isStoryInput ? MAX_STORY_MODAL_INPUT_HEIGHT : (isMobile ? 256 : 416);

  const updateInputHeight = useLastCallback((willSend = false) => {
    requestForcedReflow(() => {
      const scroller = getInputScroller(inputRef.current)!;
      const currentHeight = Number(scroller.style.height.replace('px', ''));
      const clone = scrollerCloneRef.current!;
      const { scrollHeight } = clone;
      const newHeight = Math.min(scrollHeight, maxInputHeight);

      if (newHeight === currentHeight) {
        return undefined;
      }

      const isOverflown = scrollHeight > maxInputHeight;

      function exec() {
        const transitionDuration = Math.round(
          TRANSITION_DURATION_FACTOR * Math.log(Math.abs(newHeight - currentHeight)),
        );
        scroller.style.height = `${newHeight}px`;
        scroller.style.transitionDuration = `${transitionDuration}ms`;
        scroller.classList.toggle('overflown', isOverflown);
      }

      if (willSend) {
        // Delay to next frame to sync with sending animation
        requestMutation(exec);
        return undefined;
      } else {
        return exec;
      }
    });
  });

  useLayoutEffect(() => {
    if (!isAttachmentModalInput) return;
    updateInputHeight(false);
  }, [isAttachmentModalInput, updateInputHeight]);

  const htmlRef = useRef(getHtml());
  useLayoutEffect(() => {
    const html = isActive ? getHtml() : '';

    if (html !== inputRef.current!.innerHTML) {
      inputRef.current!.innerHTML = html;
    }

    if (html !== cloneRef.current!.innerHTML) {
      cloneRef.current!.innerHTML = html;
    }

    if (html !== htmlRef.current) {
      htmlRef.current = html;

      updateInputHeight(!html);
    }
    setCursorPositionFromLast();
  }, [getHtml, isActive, lastCursorPositionRef, updateInputHeight]);

  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;
  const focusInput = useLastCallback(() => {
    if (!inputRef.current || isNeedPremium) {
      return;
    }

    if (getIsHeavyAnimating()) {
      setTimeout(focusInput, FOCUS_DELAY_MS);
      return;
    }

    focusEditableElement(inputRef.current!);
  });

  const handleCloseTextFormatter = useLastCallback(() => {
    closeTextFormatter();
    clearSelection();
  });

  const checkSelection = useCallback(() => {
    // Disable the formatter on iOS devices for now.
    if (IS_IOS) {
      return false;
    }

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || isContextMenuOpenRef.current) {
      closeTextFormatter();
      if (IS_ANDROID) {
        setIsTextFormatterDisabled(false);
      }
      return false;
    }

    const selectionRange = selection.getRangeAt(0);
    const selectedText = selectionRange.toString().trim();
    if (
      shouldSuppressTextFormatter
      || !isSelectionInsideInput(selectionRange, editableInputId || EDITABLE_INPUT_ID)
      || !selectedText
      || parseEmojiOnlyString(selectedText)
      || !selectionRange.START_TO_END
    ) {
      closeTextFormatter();
      return false;
    }

    return true;
  }, [editableInputId, shouldSuppressTextFormatter]);

  const processSelection = useCallback(() => {
    if (!checkSelection()) {
      return;
    }
    if (undoManager && inputRef.current) {
      const [start, end] = getSelectionRangePosition(inputRef.current);
      undoManager.setSelection(start, end);
    }
    if (isTextFormatterDisabled) {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    const scroller = getInputScroller(inputRef.current)!;
    const selectionRange = window.getSelection()!.getRangeAt(0);
    const selectionRect = selectionRange.getBoundingClientRect();
    const scrollerRect = scroller!.getBoundingClientRect();

    let x = (selectionRect.left + selectionRect.width / 2) - scrollerRect.left;
    const y = Math.min(scrollerRect.height, Math.max(0, selectionRect.top - scrollerRect.top));
    if (x < TEXT_FORMATTER_SAFE_AREA_PX) {
      x = TEXT_FORMATTER_SAFE_AREA_PX;
    } else if (x > scrollerRect.width - TEXT_FORMATTER_SAFE_AREA_PX) {
      x = scrollerRect.width - TEXT_FORMATTER_SAFE_AREA_PX;
    }

    setTextFormatterAnchorPosition({ x, y });
    setSelectedRange(selectionRange);
    openTextFormatter();
  }, [checkSelection, isTextFormatterDisabled, undoManager]);

  function processSelectionWithTimeout() {
    if (selectionTimeoutRef.current) {
      window.clearTimeout(selectionTimeoutRef.current);
    }
    // Small delay to allow browser properly recalculate selection
    selectionTimeoutRef.current = window.setTimeout(processSelection, SELECTION_RECALCULATE_DELAY_MS);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (e.button !== 2) {
      const listenerEl = e.currentTarget.closest(`.${INPUT_WRAPPER_CLASS}`) || e.target;
      listenerEl.addEventListener('mouseup', processSelectionWithTimeout, { once: true });
      return;
    }

    if (isContextMenuOpenRef.current) {
      return;
    }

    isContextMenuOpenRef.current = true;

    function handleCloseContextMenu(e2: KeyboardEvent | MouseEvent) {
      if (e2 instanceof KeyboardEvent && e2.key !== 'Esc' && e2.key !== 'Escape') {
        return;
      }

      setTimeout(() => {
        isContextMenuOpenRef.current = false;
      }, CONTEXT_MENU_CLOSE_DELAY_MS);

      window.removeEventListener('keydown', handleCloseContextMenu);
      window.removeEventListener('mousedown', handleCloseContextMenu);
    }

    document.addEventListener('mousedown', handleCloseContextMenu);
    document.addEventListener('keydown', handleCloseContextMenu);
  }

  function setCaretPosition(pos: number, prev = false) {
    const range = setMinCaretPosition(inputRef.current!, pos, prev);
    if (range) {
      const rect = range.getBoundingClientRect();
      const scroller = getInputScroller(inputRef.current)!;
      const scrollRect = scroller.getBoundingClientRect();
      if (rect.bottom > scrollRect.bottom) {
        scroller.scrollTop += rect.height + rect.bottom - scrollRect.bottom;
      } else if (rect.top < scrollRect.top) {
        scroller.scrollTop -= scrollRect.top - rect.top;
      }
    }
  }
  function updateHtml(html: string, pos: number) {
    setCursorPosition(pos);
    if (getHtml() !== html) {
      inputRef.current!.innerHTML = html;
      onUpdate(html);
      if (undoManager) {
        undoManager.add(inputRef.current!.innerHTML, pos, pos);
      }
    }
    setMinCaretPosition(inputRef.current!, pos);
  }

  function updateKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (inputRef.current) {
      if (undoManager && e.ctrlKey && e.code === 'KeyZ') {
        const state = e.shiftKey ? undoManager.redo() : undoManager.undo();
        if (state) {
          inputRef.current.innerHTML = state.text!;
          if (state.start && state.start === state.end) {
            setCursorPosition(state.start);
            lastSelectionPosRef.current = state.start;
          }
          onUpdate(inputRef.current.innerHTML);
          if (state.start && state.end) {
            setSelectionRangePosition(inputRef.current, state.start!, state.end!);
          }
          if (state.scroll !== undefined) {
            getInputScroller(inputRef.current)!.scrollTop = state.scroll;
          }
          processSelection();
        }
        e.preventDefault();
        return;
      }
      switch (e.key) {
        case 'Backspace':
        case 'Delete': {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if ((range.startContainer === inputRef.current && range.endContainer === inputRef.current)
                || (range.commonAncestorContainer === inputRef.current && !range.startContainer.previousSibling && !range.endContainer.nextSibling)) {
              e.preventDefault();
              updateHtml('', 0);
            }
          }
        }
          break;

        case 'Enter':
          if (e.shiftKey) {
            const [node, cur] = getSelectedElement();
            if (node && node.textContent && node.parentElement && (!node.textContent[cur] || node.textContent[cur] === '\n')) {
              const element = node.parentElement === inputRef.current && node.previousSibling ? node.previousSibling : node.parentElement;
              const type = AST_TYPE_BY_NODE_NAME[element.nodeName];
              if (type === AstNodeType.Blockquote || type === AstNodeType.Pre) {
                e.preventDefault();
                const pos = getCaretPosition(inputRef.current);
                if (type === AstNodeType.Blockquote) {
                  element.appendChild(document.createTextNode('\n\n'));
                } else {
                  node.textContent = `${node.textContent.substring(0, cur)}\n\n${node.textContent.substring(cur)}`;
                }
                updateHtml(inputRef.current.innerHTML, pos + 1);
              }
            }
          }
          break;
        case 'ArrowUp':
        case 'ArrowDown': {
          const [node, cur] = getSelectedElement();
          if (node) {
            e.preventDefault();
            const top = e.key === 'ArrowUp';
            const pos = getCaretPosition(inputRef.current);
            if (top) {
              const prev = getPrevNewline(node, cur);
              setCaretPosition(pos - prev, true);
            } else {
              const next = getNextNewline(node, cur);
              setCaretPosition(pos + next);
            }
          }
        }
          break;
      }
    }
  }

  function insertAfter(referenceNode: Node, newNode: Node) {
    referenceNode.parentNode?.insertBefore(newNode, referenceNode.nextSibling);
  }
  function onSelectionChange() {
    if (inputRef.current && inputRef.current === document.activeElement) {
      if (getSelectedText2().length === 0) {
        const pos = getCaretPosition(inputRef.current);
        if (pos !== lastSelectionPosRef.current) {
          let [element] = getSelectedElement();
          const startOffset = -setNotEditable(inputRef.current, element, pos);
          let offset = 0;
          if (!element?.isConnected) {
            setMinCaretPosition(inputRef.current!, pos + startOffset);
            [element] = getSelectedElement();
          }
          if (element && element !== inputRef.current) {
            offset = setEditableNode(inputRef.current, element, pos + startOffset);
          }
          if (offset !== 0 || startOffset !== 0) {
            updateHtml(inputRef.current.innerHTML, pos + offset + startOffset);
          }
          lastSelectionPosRef.current = pos + offset + startOffset;
        }
      }
    }
    document.addEventListener('selectionchange', onSelectionChange, { once: true });
  }
  document.addEventListener('selectionchange', onSelectionChange, { once: true });

  function updateChanged() {
    if (inputRef.current && getSelectedText2().length === 0) {
      let [pos, endOfLine] = getCaretPositionEnd(inputRef.current);
      const [node] = getSelectedElement();
      if (node && node.parentElement) {
        let editableElement = node.parentElement;
        while (editableElement !== inputRef.current && editableElement.parentElement && isEditableElement(editableElement.parentElement)) {
          if (!editableElement.parentElement.dataset.entityType) {
            const type = AST_TYPE_BY_NODE_NAME[editableElement.parentElement.tagName];
            if (!type) {
              break;
            }
          }
          editableElement = editableElement.parentElement!;
        }
        if (editableElement === inputRef.current) {
          const root = parseMarkdownToAst(node.textContent!);
          const block = root.getNotTextNode();
          if (block) {
            const html = renderAst(root);
            const div = document.createElement('div');
            div.innerHTML = html;
            setNotClosedNodes(div);
            setEditableNodes(inputRef.current, div, pos);
            const element = div.firstChild as HTMLElement;
            if (element) {
              editableElement.replaceChild(element, node);
              let first: Node = element;
              while (div.firstChild) {
                const temp = div.firstChild;
                insertAfter(first, div.firstChild);
                first = temp;
              }
            }
          }
        } else {
          pos += setEditableNode(inputRef.current, editableElement, pos);
          const editableType = AST_TYPE_BY_NODE_NAME[editableElement.tagName];
          if (!(editableType === AstNodeType.Pre && isEditableElement(editableElement) && isClosedElement(editableElement))) {
            const root = parseMarkdownToAst(editableElement.innerHTML, isClosedElement(editableElement));
            const div = document.createElement('div');
            div.innerHTML = renderAst(root, true);
            setEditableNodes(inputRef.current, div, pos);
            const [closedElement, oldElement] = getClosedElement(editableElement, div.firstChild, node.parentElement);
            if (closedElement) {
              validateNotClosed(closedElement);
              if (editableType === AstNodeType.Pre || editableType === AstNodeType.Blockquote) {
                pos -= getCursorOffset(inputRef.current, editableElement, div.innerHTML, pos, true);
              } else {
                pos -= getCursorOffset(inputRef.current, oldElement || node.parentElement, closedElement.innerHTML, pos, true);
              }
              pos++;
              const type = AST_TYPE_BY_NODE_NAME[closedElement.tagName];
              if (type === AstNodeType.Pre) {
                insertAfter(node.parentElement, document.createTextNode('\n'));
              } else {
                insertAfter(closedElement, document.createTextNode(' '));
              }
            } else if (isEditableElement(editableElement)) {
              setEditableNode(inputRef.current, div.firstChild!, pos);
            }
            editableElement.outerHTML = div.innerHTML;
          }
        }
        lastSelectionPosRef.current = -1;
        updateHtml(inputRef.current!.innerHTML, pos);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // https://levelup.gitconnected.com/javascript-events-handlers-keyboard-and-load-events-1b3e46a6b0c3#1960
    const { isComposing } = e;
    const html = getHtml();
    if (!isComposing && !html && (e.metaKey || e.ctrlKey)) {
      const targetIndexDelta = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : undefined;
      if (targetIndexDelta) {
        e.preventDefault();
        replyToNextMessage({ targetIndexDelta });
        return;
      }
    }
    if (!isComposing && e.key === 'Enter' && !e.shiftKey) {
      if (
        !isMobileDevice
        && (
          (messageSendKeyCombo === 'enter' && !e.shiftKey)
          || (messageSendKeyCombo === 'ctrl-enter' && (e.ctrlKey || e.metaKey))
        )
      ) {
        e.preventDefault();
        closeTextFormatter();
        onSend();
      }
    } else if (!isComposing && e.key === 'ArrowUp' && !html && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      editLastMessage();
    } else {
      updateKey(e);
      e.target.addEventListener('keyup', processSelectionWithTimeout, { once: true });
    }
  }

  useEffect(() => {
    const handleScroll = (e: Event): void => {
      const s = getInputScroller(inputRef.current);
      if (s && s === e.target && undoManager) {
        undoManager.setScroll(s.scrollTop);
        processSelection();
      }
    };
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [undoManager, processSelection]);

  function handleChange(e: ChangeEvent<HTMLDivElement>) {
    const { innerHTML, textContent } = e.currentTarget;

    updateChanged();

    // Reset focus on the input to remove any active styling when input is cleared
    if (
      !IS_TOUCH_ENV
      && (!textContent || !textContent.length)
      // When emojis are not supported, innerHTML contains an emoji img tag that doesn't exist in the textContext
      && !(!IS_EMOJI_SUPPORTED && innerHTML.includes('emoji-small'))
      && !(innerHTML.includes('custom-emoji'))
    ) {
      const selection = window.getSelection()!;
      if (selection) {
        inputRef.current!.blur();
        selection.removeAllRanges();
        focusEditableElement(inputRef.current!, true);
      }
    }
  }

  function handleAndroidContextMenu(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (!checkSelection()) {
      return;
    }

    setIsTextFormatterDisabled(!isTextFormatterDisabled);

    if (!isTextFormatterDisabled) {
      e.preventDefault();
      e.stopPropagation();

      processSelection();
    } else {
      closeTextFormatter();
    }
  }

  function handleClick() {
    if (isAttachmentModalInput || canSendPlainText || (isStoryInput && isNeedPremium)) return;
    showAllowedMessageTypesNotification({ chatId });
  }

  const handleOpenPremiumModal = useLastCallback(() => openPremiumModal());

  useEffect(() => {
    if (IS_TOUCH_ENV) {
      return;
    }

    if (canAutoFocus) {
      focusInput();
    }
  }, [chatId, focusInput, replyInfo, canAutoFocus]);

  function handleCopy(e: React.ClipboardEvent<HTMLDivElement>) {
    if (!e.clipboardData) {
      return;
    }
    const html = getSelectedText()!;
    if (isHtml(html)) {
      e.preventDefault();
      const text = htmlToMarkdown(html, TG_TAGS);
      e.clipboardData.setData('text', text);
    }
  }

  useEffect(() => {
    if (
      !chatId
      || editableInputId !== EDITABLE_INPUT_ID
      || noFocusInterception
      || isMobileDevice
      || isSelectModeActive
    ) {
      return undefined;
    }

    const handleDocumentKeyDown = (e: KeyboardEvent) => {
      if (getIsDirectTextInputDisabled()) {
        return;
      }

      const { key } = e;
      const target = e.target as HTMLElement | undefined;

      if (!target || IGNORE_KEYS.includes(key)) {
        return;
      }

      const input = inputRef.current!;
      const isSelectionCollapsed = document.getSelection()?.isCollapsed;
      if (
        ((key.startsWith('Arrow') || (e.shiftKey && key === 'Shift')) && !isSelectionCollapsed)
        || (e.code === 'KeyC' && (e.ctrlKey || e.metaKey) && target.tagName !== 'INPUT')
      ) {
        return;
      }

      if (
        input
        && target !== input
        && target.tagName !== 'INPUT'
        && target.tagName !== 'TEXTAREA'
        && !target.isContentEditable
      ) {
        focusEditableElement(input, true, true);

        const newEvent = new KeyboardEvent(e.type, e as any);
        input.dispatchEvent(newEvent);
      }
    };

    document.addEventListener('keydown', handleDocumentKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown, true);
    };
  }, [chatId, editableInputId, isMobileDevice, isSelectModeActive, noFocusInterception, onUpdate, undoManager]);

  useEffect(() => {
    const captureFirstTab = debounce((e: KeyboardEvent) => {
      if (e.key === 'Tab' && !getIsDirectTextInputDisabled()) {
        e.preventDefault();
        requestMutation(focusInput);
      }
    }, TAB_INDEX_PRIORITY_TIMEOUT, true, false);

    return captureKeyboardListeners({ onTab: captureFirstTab });
  }, [focusInput]);

  useEffect(() => {
    const input = inputRef.current!;

    function suppressFocus() {
      input.blur();
    }

    if (shouldSuppressFocus) {
      input.addEventListener('focus', suppressFocus);
    }

    return () => {
      input.removeEventListener('focus', suppressFocus);
    };
  }, [shouldSuppressFocus]);

  const isTouched = useDerivedState(() => Boolean(isActive && getHtml()), [isActive, getHtml]);

  const className = buildClassName(
    'form-control allow-selection',
    isTouched && 'touched',
    shouldSuppressFocus && 'focus-disabled',
  );

  const inputScrollerContentClass = buildClassName('input-scroller-content', isNeedPremium && 'is-need-premium');

  return (
    <div id={id} onClick={shouldSuppressFocus ? onSuppressedFocus : undefined} dir={lang.isRtl ? 'rtl' : undefined}>
      <div
        className={buildClassName('custom-scroll', SCROLLER_CLASS, isNeedPremium && 'is-need-premium')}
        onScroll={onScroll}
        onClick={!isAttachmentModalInput && !canSendPlainText ? handleClick : undefined}
      >
        <div className={inputScrollerContentClass}>
          <div
            ref={inputRef}
            id={editableInputId || EDITABLE_INPUT_ID}
            className={className}
            contentEditable={isAttachmentModalInput || canSendPlainText}
            role="textbox"
            dir="auto"
            tabIndex={0}
            onClick={focusInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCopy={handleCopy}
            onMouseDown={handleMouseDown}
            onContextMenu={IS_ANDROID ? handleAndroidContextMenu : undefined}
            onTouchCancel={IS_ANDROID ? processSelectionWithTimeout : undefined}
            aria-label={placeholder}
            onFocus={!isNeedPremium ? onFocus : undefined}
            onBlur={!isNeedPremium ? onBlur : undefined}
          />
          {!forcedPlaceholder && (
            <span
              className={buildClassName(
                'placeholder-text',
                !isAttachmentModalInput && !canSendPlainText && 'with-icon',
                isNeedPremium && 'is-need-premium',
              )}
              dir="auto"
            >
              {!isAttachmentModalInput && !canSendPlainText
                && <Icon name="lock-badge" className="placeholder-icon" />}
              {shouldDisplayTimer ? (
                <TextTimer langKey={timedPlaceholderLangKey!} endsAt={timedPlaceholderDate!} onEnd={handleTimerEnd} />
              ) : placeholder}
              {isStoryInput && isNeedPremium && (
                <Button className="unlock-button" size="tiny" color="adaptive" onClick={handleOpenPremiumModal}>
                  {lang('StoryRepliesLockedButton')}
                </Button>
              )}
            </span>
          )}
          <canvas ref={sharedCanvasRef} className="shared-canvas" />
          <canvas ref={sharedCanvasHqRef} className="shared-canvas" />
          <div ref={absoluteContainerRef} className="absolute-video-container" />
        </div>
      </div>
      <div
        ref={scrollerCloneRef}
        className={buildClassName('custom-scroll',
          SCROLLER_CLASS,
          'clone',
          isNeedPremium && 'is-need-premium')}
      >
        <div className={inputScrollerContentClass}>
          <div ref={cloneRef} className={buildClassName(className, 'clone')} dir="auto" />
        </div>
      </div>
      {captionLimit !== undefined && (
        <div className="max-length-indicator" dir="auto">
          {captionLimit}
        </div>
      )}
      <TextFormatter
        inputDiv={inputRef!.current}
        editableInputId={editableInputId || EDITABLE_INPUT_ID}
        isOpen={isTextFormatterOpen}
        anchorPosition={textFormatterAnchorPosition}
        selectedRange={selectedRange}
        undoManager={undoManager}
        setSelectedRange={setSelectedRange}
        onClose={handleCloseTextFormatter}
        onUpdate={onUpdate}
        processSelection={processSelection}
      />
      {forcedPlaceholder && <span className="forced-placeholder">{renderText(forcedPlaceholder!)}</span>}
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global, { chatId, threadId }: OwnProps): StateProps => {
    const { messageSendKeyCombo } = global.settings.byKey;
    return {
      messageSendKeyCombo,
      replyInfo: chatId && threadId ? selectDraft(global, chatId, threadId)?.replyInfo : undefined,
      isSelectModeActive: selectIsInSelectMode(global),
      canPlayAnimatedEmojis: selectCanPlayAnimatedEmojis(global),
    };
  },
)(MessageInput));
