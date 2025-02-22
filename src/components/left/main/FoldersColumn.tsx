import type { FC } from '../../../lib/teact/teact';
import React, {
  memo, useEffect, useMemo, useRef,
} from '../../../lib/teact/teact';
import { getActions } from '../../../global';

import type { TabWithProperties } from '../../ui/TabList';

import {
  APP_NAME, DEBUG, IS_BETA,
} from '../../../config';
import buildClassName from '../../../util/buildClassName';
import captureEscKeyListener from '../../../util/captureEscKeyListener';
import { captureEvents, SwipeDirection } from '../../../util/captureEvents';
import { IS_ELECTRON, IS_MAC_OS, IS_TOUCH_ENV } from '../../../util/windowEnvironment';

import useAppLayout from '../../../hooks/useAppLayout';
import useDerivedState from '../../../hooks/useDerivedState';
import useFlag from '../../../hooks/useFlag';
import useHistoryBack from '../../../hooks/useHistoryBack';
import useLastCallback from '../../../hooks/useLastCallback';
import useOldLang from '../../../hooks/useOldLang';
import useShowTransition from '../../../hooks/useShowTransition';
import { useFullscreenStatus } from '../../../hooks/window/useFullscreen';
import useLeftHeaderButtonRtlForumTransition from './hooks/useLeftHeaderButtonRtlForumTransition';

import StoryRibbon from '../../story/StoryRibbon';
import Button from '../../ui/Button';
import DropdownMenu from '../../ui/DropdownMenu';
import TabList from '../../ui/TabList';
import LeftSideMenuItems from './LeftSideMenuItems';


type OwnProps = {
  shouldHideSearch?: boolean;
  shouldSkipTransition?: boolean;
  isForumPanelOpen?: boolean;
  onSelectSettings: NoneToVoidFunction;
  onSelectContacts: NoneToVoidFunction;
  onSelectArchived: NoneToVoidFunction;
  onReset: NoneToVoidFunction;
  orderedFolderIds?: number[];
  activeChatFolder: number;
  currentUserId?: string;
  isStoryRibbonShown?: boolean;
  folderTabs: readonly TabWithProperties[];
};

const SAVED_MESSAGES_HOTKEY = '0';
const FIRST_FOLDER_INDEX = 0;

const FoldersColumn: FC<OwnProps> = ({
  folderTabs,
  shouldHideSearch,
  orderedFolderIds,
  activeChatFolder,
  currentUserId,
  isForumPanelOpen,
  shouldSkipTransition,
  isStoryRibbonShown,
  onSelectSettings,
  onSelectContacts,
  onSelectArchived,
  onReset,
}) => {
  const {
    loadChatFolders,
    setActiveChatFolder,
    openChat,
  } = getActions();

  // eslint-disable-next-line no-null/no-null
  const transitionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatFolders();
  }, []);

  const {
    ref,
    shouldRender: shouldRenderStoryRibbon,
    getIsClosing: getIsStoryRibbonClosing,
  } = useShowTransition({
    isOpen: isStoryRibbonShown,
    className: false,
    withShouldRender: true,
  });
  const isStoryRibbonClosing = useDerivedState(getIsStoryRibbonClosing);
  const isInFirstFolder = FIRST_FOLDER_INDEX === activeChatFolder;

  const handleSwitchTab = useLastCallback((index: number) => {
    setActiveChatFolder({ activeChatFolder: index }, { forceOnHeavyAnimation: true });
  });

  // Prevent `activeTab` pointing at non-existing folder after update
  useEffect(() => {
    if (!folderTabs?.length) {
      return;
    }

    if (activeChatFolder >= folderTabs.length) {
      setActiveChatFolder({ activeChatFolder: FIRST_FOLDER_INDEX });
    }
  }, [activeChatFolder, folderTabs, setActiveChatFolder]);

  useEffect(() => {
    if (!IS_TOUCH_ENV || !folderTabs?.length || isForumPanelOpen) {
      return undefined;
    }

    return captureEvents(transitionRef.current!, {
      selectorToPreventScroll: '.chat-list',
      onSwipe: ((e, direction) => {
        if (direction === SwipeDirection.Left) {
          setActiveChatFolder(
            { activeChatFolder: Math.min(activeChatFolder + 1, folderTabs.length - 1) },
            { forceOnHeavyAnimation: true },
          );
          return true;
        } else if (direction === SwipeDirection.Right) {
          setActiveChatFolder({ activeChatFolder: Math.max(0, activeChatFolder - 1) }, { forceOnHeavyAnimation: true });
          return true;
        }

        return false;
      }),
    });
  }, [activeChatFolder, folderTabs, isForumPanelOpen, setActiveChatFolder]);

  const isNotInFirstFolderRef = useRef();
  isNotInFirstFolderRef.current = !isInFirstFolder;
  useEffect(() => (isNotInFirstFolderRef.current ? captureEscKeyListener(() => {
    if (isNotInFirstFolderRef.current) {
      setActiveChatFolder({ activeChatFolder: FIRST_FOLDER_INDEX });
    }
  }) : undefined), [activeChatFolder, setActiveChatFolder]);

  useHistoryBack({
    isActive: !isInFirstFolder,
    onBack: () => setActiveChatFolder({ activeChatFolder: FIRST_FOLDER_INDEX }, { forceOnHeavyAnimation: true }),
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code.startsWith('Digit') && folderTabs) {
        const [, digit] = e.code.match(/Digit(\d)/) || [];
        if (!digit) return;

        if (digit === SAVED_MESSAGES_HOTKEY) {
          openChat({ id: currentUserId, shouldReplaceHistory: true });
          return;
        }

        const folder = Number(digit) - 1;
        if (folder > folderTabs.length - 1) return;

        setActiveChatFolder({ activeChatFolder: folder }, { forceOnHeavyAnimation: true });
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [currentUserId, folderTabs, openChat, setActiveChatFolder]);

  const {
    ref: placeholderRef,
    shouldRender: shouldRenderPlaceholder,
  } = useShowTransition({
    isOpen: !orderedFolderIds,
    noMountTransition: true,
    withShouldRender: true,
  });

  const {
    shouldDisableDropdownMenuTransitionRef,
    handleDropdownMenuTransitionEnd,
  } = useLeftHeaderButtonRtlForumTransition(shouldHideSearch);

  const versionString = IS_BETA ? `${APP_VERSION} Beta (${APP_REVISION})` : (DEBUG ? APP_REVISION : APP_VERSION);
  const oldLang = useOldLang();
  const { isMobile } = useAppLayout();

  const [isBotMenuOpen, markBotMenuOpen, unmarkBotMenuOpen] = useFlag();

  const isFullscreen = useFullscreenStatus();

  const hasMenu = true;
  const MainButton: FC<{ onTrigger: () => void; isOpen?: boolean }> = useMemo(() => {
    return ({ onTrigger, isOpen }) => (
      <Button
        round
        ripple={hasMenu && !isMobile}
        size="smaller"
        color="translucent"
        className={isOpen ? 'active' : ''}
        // eslint-disable-next-line react/jsx-no-bind
        onClick={hasMenu ? onTrigger : () => onReset()}
        ariaLabel={hasMenu ? oldLang('AccDescrOpenMenu2') : 'Return to chat list'}
      >
        <div className={buildClassName(
          'animated-menu-icon',
          !hasMenu && 'state-back',
          shouldSkipTransition && 'no-animation',
        )}
        />
      </Button>
    );
  }, [hasMenu, isMobile, oldLang, onReset, shouldSkipTransition]);

  return (
    <div ref={ref} className={buildClassName('FoldersColumn')}>
      <DropdownMenu
        trigger={MainButton}
        footer={`${APP_NAME} ${versionString}`}
        className={buildClassName(
          'main-menu',
          oldLang.isRtl && 'rtl',
          shouldHideSearch && oldLang.isRtl && 'right-aligned',
          shouldDisableDropdownMenuTransitionRef.current && oldLang.isRtl && 'disable-transition',
        )}
        forceOpen={isBotMenuOpen}
        positionX={shouldHideSearch && oldLang.isRtl ? 'right' : 'left'}
        transformOriginX={IS_ELECTRON && IS_MAC_OS && !isFullscreen ? 90 : undefined}
        onTransitionEnd={oldLang.isRtl ? handleDropdownMenuTransitionEnd : undefined}
      >
        <LeftSideMenuItems
          onSelectArchived={onSelectArchived}
          onSelectContacts={onSelectContacts}
          onSelectSettings={onSelectSettings}
          onBotMenuOpened={markBotMenuOpen}
          onBotMenuClosed={unmarkBotMenuOpen}
        />
      </DropdownMenu>
      {shouldRenderStoryRibbon && <StoryRibbon isClosing={isStoryRibbonClosing} />}
      <TabList
        contextRootElementSelector="#LeftColumn"
        tabs={folderTabs}
        activeTab={activeChatFolder}
        onSwitchTab={handleSwitchTab}
      />
    </div>
  );
};

export default memo(FoldersColumn);
