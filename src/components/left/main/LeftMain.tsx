import type { FC } from '../../../lib/teact/teact';
import React, {
  memo, useEffect, useMemo, useRef, useState,
} from '../../../lib/teact/teact';
import { getActions, getGlobal, withGlobal } from '../../../global';

import type {
  ApiChatFolder, ApiChatlistExportedInvite, ApiMessageEntity, ApiMessageEntityCustomEmoji, ApiSession,
} from '../../../api/types';
import type { GlobalState } from '../../../global/types';
import type { FolderEditDispatch } from '../../../hooks/reducers/useFoldersReducer';
import type { SettingsScreens } from '../../../types';
import type { MenuItemContextAction } from '../../ui/ListItem';
import type { TabWithProperties } from '../../ui/TabList';
import { ApiMessageEntityTypes } from '../../../api/types';
import { LeftColumnContent } from '../../../types';

import { ALL_FOLDER_ID, PRODUCTION_URL } from '../../../config';
import { selectCanShareFolder, selectTabState } from '../../../global/selectors';
import { selectCurrentLimit } from '../../../global/selectors/limits';
import buildClassName from '../../../util/buildClassName';
import { MEMO_EMPTY_ARRAY } from '../../../util/memo';
import { IS_ELECTRON, IS_TOUCH_ENV } from '../../../util/windowEnvironment';
import { renderTextWithEntities } from '../../common/helpers/renderTextWithEntities';

import { useFolderManagerForUnreadCounters } from '../../../hooks/useFolderManager';
import useForumPanelRender from '../../../hooks/useForumPanelRender';
import useLastCallback from '../../../hooks/useLastCallback';
import useOldLang from '../../../hooks/useOldLang';
import useShowTransitionDeprecated from '../../../hooks/useShowTransitionDeprecated';

import Button from '../../ui/Button';
import Transition from '../../ui/Transition';
import NewChatButton from '../NewChatButton';
import LeftSearch from '../search/LeftSearch.async';
import ChatFolders from './ChatFolders';
import ContactList from './ContactList.async';
import FoldersColumn from './FoldersColumn';
import ForumPanel from './ForumPanel';
import LeftMainHeader from './LeftMainHeader';

import './LeftMain.scss';

type OwnProps = {
  content: LeftColumnContent;
  searchQuery?: string;
  searchDate?: number;
  contactsFilter: string;
  shouldSkipTransition?: boolean;
  foldersDispatch: FolderEditDispatch;
  isAppUpdateAvailable?: boolean;
  isElectronUpdateAvailable?: boolean;
  isForumPanelOpen?: boolean;
  isClosingSearch?: boolean;
  onSearchQuery: (query: string) => void;
  onContentChange: (content: LeftColumnContent) => void;
  onSettingsScreenSelect: (screen: SettingsScreens) => void;
  onTopicSearch: NoneToVoidFunction;
  onReset: () => void;
};
type StateProps = {
  showChatFolderOnTop: boolean;
  chatFoldersById: Record<number, ApiChatFolder>;
  folderInvitesById: Record<number, ApiChatlistExportedInvite[]>;
  orderedFolderIds?: number[];
  activeChatFolder: number;
  currentUserId?: string;
  shouldSkipHistoryAnimations?: boolean;
  maxFolders: number;
  maxChatLists: number;
  maxFolderInvites: number;
  hasArchivedChats?: boolean;
  hasArchivedStories?: boolean;
  archiveSettings: GlobalState['archiveSettings'];
  isStoryRibbonShown?: boolean;
  sessions?: Record<string, ApiSession>;
};
const TRANSITION_RENDER_COUNT = Object.keys(LeftColumnContent).length / 2;
const BUTTON_CLOSE_DELAY_MS = 250;

let closeTimeout: number | undefined;

const LeftMain: FC<OwnProps & StateProps> = ({
  showChatFolderOnTop,
  archiveSettings,
  chatFoldersById,
  orderedFolderIds,
  maxFolders,
  maxChatLists,
  folderInvitesById,
  maxFolderInvites,
  activeChatFolder,
  content,
  searchQuery,
  searchDate,
  isClosingSearch,
  contactsFilter,
  shouldSkipTransition,
  foldersDispatch,
  isAppUpdateAvailable,
  isElectronUpdateAvailable,
  isForumPanelOpen,
  onSearchQuery,
  onContentChange,
  onSettingsScreenSelect,
  onReset,
  onTopicSearch,
}) => {
  const {
    closeForumPanel,
    openShareChatFolderModal,
    openDeleteChatFolderModal,
    openEditChatFolder,
    openLimitReachedModal,
  } = getActions();
  const [isNewChatButtonShown, setIsNewChatButtonShown] = useState(IS_TOUCH_ENV);
  const [isElectronAutoUpdateEnabled, setIsElectronAutoUpdateEnabled] = useState(false);

  useEffect(() => {
    window.electron?.getIsAutoUpdateEnabled().then(setIsElectronAutoUpdateEnabled);
  }, []);

  const {
    shouldRenderForumPanel, handleForumPanelAnimationEnd,
    handleForumPanelAnimationStart, isAnimationStarted,
  } = useForumPanelRender(isForumPanelOpen);
  const isForumPanelRendered = isForumPanelOpen && content === LeftColumnContent.ChatList;
  const isForumPanelVisible = isForumPanelRendered && isAnimationStarted;

  const {
    shouldRender: shouldRenderUpdateButton,
    transitionClassNames: updateButtonClassNames,
  } = useShowTransitionDeprecated(isAppUpdateAvailable || isElectronUpdateAvailable);

  const isMouseInside = useRef(false);

  const handleMouseEnter = useLastCallback(() => {
    if (content !== LeftColumnContent.ChatList) {
      return;
    }
    isMouseInside.current = true;
    setIsNewChatButtonShown(true);
  });

  const handleMouseLeave = useLastCallback(() => {
    isMouseInside.current = false;

    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = undefined;
    }

    closeTimeout = window.setTimeout(() => {
      if (!isMouseInside.current) {
        setIsNewChatButtonShown(false);
      }
    }, BUTTON_CLOSE_DELAY_MS);
  });

  const handleSelectSettings = useLastCallback(() => {
    onContentChange(LeftColumnContent.Settings);
  });

  const handleSelectContacts = useLastCallback(() => {
    onContentChange(LeftColumnContent.Contacts);
  });

  const handleSelectArchived = useLastCallback(() => {
    onContentChange(LeftColumnContent.Archived);
    closeForumPanel();
  });

  const handleUpdateClick = useLastCallback(() => {
    if (IS_ELECTRON && !isElectronAutoUpdateEnabled) {
      window.open(`${PRODUCTION_URL}/get`, '_blank', 'noopener');
    } else if (isElectronUpdateAvailable) {
      window.electron?.installUpdate();
    } else {
      window.location.reload();
    }
  });

  const handleSelectNewChannel = useLastCallback(() => {
    onContentChange(LeftColumnContent.NewChannelStep1);
  });

  const handleSelectNewGroup = useLastCallback(() => {
    onContentChange(LeftColumnContent.NewGroupStep1);
  });

  useEffect(() => {
    let autoCloseTimeout: number | undefined;
    if (content !== LeftColumnContent.ChatList) {
      autoCloseTimeout = window.setTimeout(() => {
        setIsNewChatButtonShown(false);
      }, BUTTON_CLOSE_DELAY_MS);
    } else if (isMouseInside.current || IS_TOUCH_ENV) {
      setIsNewChatButtonShown(true);
    }

    return () => {
      if (autoCloseTimeout) {
        clearTimeout(autoCloseTimeout);
        autoCloseTimeout = undefined;
      }
    };
  }, [content]);

  const lang = useOldLang();

  const allChatsFolder: ApiChatFolder = useMemo(() => {
    return {
      id: ALL_FOLDER_ID,
      title: { text: lang('FilterAllChats')},
      includedChatIds: MEMO_EMPTY_ARRAY,
      excludedChatIds: MEMO_EMPTY_ARRAY,
    } satisfies ApiChatFolder;
  }, [orderedFolderIds, lang]);

  const displayedFolders = useMemo(() => {
    return orderedFolderIds
      ? orderedFolderIds.map((id) => {
        if (id === ALL_FOLDER_ID) {
          return allChatsFolder;
        }

        return chatFoldersById[id] || {};
      }).filter(Boolean)
      : undefined;
  }, [chatFoldersById, allChatsFolder, orderedFolderIds]);

  const folderCountersById = useFolderManagerForUnreadCounters();
  const folderTabs = useMemo(() => {
    if (!displayedFolders || !displayedFolders.length) {
      return undefined;
    }

    return displayedFolders.map((folder, i) => {
      const { id, title, emoticon } = folder;
      const isBlocked = id !== ALL_FOLDER_ID && i > maxFolders - 1;
      const canShareFolder = selectCanShareFolder(getGlobal(), id);
      const contextActions: MenuItemContextAction[] = [];

      if (canShareFolder) {
        contextActions.push({
          title: lang('FilterShare'),
          icon: 'link',
          handler: () => {
            const chatListCount = Object.values(chatFoldersById).reduce((acc, el) => acc + (el.isChatList ? 1 : 0), 0);
            if (chatListCount >= maxChatLists && !folder.isChatList) {
              openLimitReachedModal({
                limit: 'chatlistJoined',
              });
              return;
            }

            // Greater amount can be after premium downgrade
            if (folderInvitesById[id]?.length >= maxFolderInvites) {
              openLimitReachedModal({
                limit: 'chatlistInvites',
              });
              return;
            }

            openShareChatFolderModal({
              folderId: id,
            });
          },
        });
      }

      if (id !== ALL_FOLDER_ID) {
        contextActions.push({
          title: lang('FilterEdit'),
          icon: 'edit',
          handler: () => {
            openEditChatFolder({ folderId: id });
          },
        });

        contextActions.push({
          title: lang('FilterDelete'),
          icon: 'delete',
          destructive: true,
          handler: () => {
            openDeleteChatFolderModal({ folderId: id });
          },
        });
      }
      // const eicon = emoticon || '💬';
      // const entities: ApiMessageEntity[] = [];
      // let text = title.text;
      //
      // const icon = { offset: 0, length: eicon.length } as ApiMessageEntityCustomEmoji;
      // const titleText = { offset: eicon.length, length: text.length } as ApiMessageEntity;
      //
      // text = eicon + text;
      // entities.push(icon);
      // entities.push(titleText);

      return {
        id,
        icon: emoticon || '💬',
        title: renderTextWithEntities({
          text: title.text,
          entities: title.entities,
          noCustomEmojiPlayback: folder.noTitleAnimations,
          // shouldRenderAsHtml: true,
        }),
        badgeCount: folderCountersById[id]?.chatsCount,
        isBadgeActive: Boolean(folderCountersById[id]?.notificationsCount),
        isBlocked,
        contextActions: contextActions?.length ? contextActions : undefined,
      } satisfies TabWithProperties;
    });
  }, [
    displayedFolders, maxFolders, folderCountersById, lang, chatFoldersById, maxChatLists, folderInvitesById,
    maxFolderInvites,
  ]);
  const shouldFoldersColumn = !showChatFolderOnTop && folderTabs && folderTabs.length > 1;
  const shouldRenderFolders = showChatFolderOnTop && folderTabs && folderTabs.length > 1;
  return (
    <div
      id="LeftColumn-main"
      onMouseEnter={!IS_TOUCH_ENV ? handleMouseEnter : undefined}
      onMouseLeave={!IS_TOUCH_ENV ? handleMouseLeave : undefined}
    >
      { shouldFoldersColumn ? (
        <FoldersColumn
          folderTabs={folderTabs!}
          // chatFoldersById={chatFoldersById}
          // folderInvitesById={folderInvitesById}
          activeChatFolder={activeChatFolder}
          // shouldHideFolderTabs={isForumPanelVisible}
          // onSettingsScreenSelect={onSettingsScreenSelect}
          // onLeftColumnContentChange={onContentChange}
          // foldersDispatch={foldersDispatch}
          isForumPanelOpen={isForumPanelVisible}
          shouldHideSearch={isForumPanelVisible}
          // onSearchQuery={onSearchQuery}
          onSelectSettings={handleSelectSettings}
          onSelectContacts={handleSelectContacts}
          onSelectArchived={handleSelectArchived}
          onReset={onReset}
          shouldSkipTransition={shouldSkipTransition}
        />
      ) : undefined }
      <div className="Main">
        <LeftMainHeader
          shouldHideDropdownMenu={!shouldFoldersColumn}
          shouldHideSearch={isForumPanelVisible}
          content={content}
          contactsFilter={contactsFilter}
          onSearchQuery={onSearchQuery}
          onSelectSettings={handleSelectSettings}
          onSelectContacts={handleSelectContacts}
          onSelectArchived={handleSelectArchived}
          onReset={onReset}
          shouldSkipTransition={shouldSkipTransition}
          isClosingSearch={isClosingSearch}
        />
        <Transition
          name={shouldSkipTransition ? 'none' : 'zoomFade'}
          renderCount={TRANSITION_RENDER_COUNT}
          activeKey={content}
          shouldCleanup
          cleanupExceptionKey={LeftColumnContent.ChatList}
          shouldWrap
          wrapExceptionKey={LeftColumnContent.ChatList}
        >
          {(isActive) => {
            switch (content) {
              case LeftColumnContent.ChatList:
                return (
                  <ChatFolders
                    folderTabs={folderTabs!}
                    shouldRenderFolders={shouldRenderFolders}
                    displayedFolders={displayedFolders!}
                    chatFoldersById={chatFoldersById}
                    activeChatFolder={activeChatFolder}
                    archiveSettings={archiveSettings}
                    shouldHideFolderTabs={isForumPanelVisible}
                    onSettingsScreenSelect={onSettingsScreenSelect}
                    onLeftColumnContentChange={onContentChange}
                    foldersDispatch={foldersDispatch}
                    isForumPanelOpen={isForumPanelVisible}
                  />
                );
              case LeftColumnContent.GlobalSearch:
                return (
                  <LeftSearch
                    searchQuery={searchQuery}
                    searchDate={searchDate}
                    isActive={isActive}
                    onReset={onReset}
                  />
                );
              case LeftColumnContent.Contacts:
                return <ContactList filter={contactsFilter} isActive={isActive} onReset={onReset} />;
              default:
                return undefined;
            }
          }}
        </Transition>
        {shouldRenderUpdateButton && (
          <Button
            fluid
            badge
            className={buildClassName('btn-update', updateButtonClassNames)}
            onClick={handleUpdateClick}
          >
            {lang('lng_update_telegram')}
          </Button>
        )}
        {shouldRenderForumPanel && (
          <ForumPanel
            isOpen={isForumPanelOpen}
            isHidden={!isForumPanelRendered}
            onTopicSearch={onTopicSearch}
            onOpenAnimationStart={handleForumPanelAnimationStart}
            onCloseAnimationEnd={handleForumPanelAnimationEnd}
          />
        )}
        <NewChatButton
          isShown={isNewChatButtonShown}
          onNewPrivateChat={handleSelectContacts}
          onNewChannel={handleSelectNewChannel}
          onNewGroup={handleSelectNewGroup}
        />
      </div>
    </div>
  );
};
export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    const {
      chatFolders: {
        byId: chatFoldersById,
        orderedIds: orderedFolderIds,
        invites: folderInvitesById,
      },
      chats: {
        listIds: {
          archived,
        },
      },
      stories: {
        orderedPeerIds: {
          archived: archivedStories,
        },
      },
      activeSessions: {
        byHash: sessions,
      },
      currentUserId,
      archiveSettings,
    } = global;
    const { shouldSkipHistoryAnimations, activeChatFolder } = selectTabState(global);
    const { storyViewer: { isRibbonShown: isStoryRibbonShown } } = selectTabState(global);

    return {
      chatFoldersById,
      folderInvitesById,
      orderedFolderIds,
      activeChatFolder,
      currentUserId,
      shouldSkipHistoryAnimations,
      showChatFolderOnTop: global.settings.byKey.showChatFolderOnTop,
      hasArchivedChats: Boolean(archived?.length),
      hasArchivedStories: Boolean(archivedStories?.length),
      maxFolders: selectCurrentLimit(global, 'dialogFilters'),
      maxFolderInvites: selectCurrentLimit(global, 'chatlistInvites'),
      maxChatLists: selectCurrentLimit(global, 'chatlistJoined'),
      archiveSettings,
      isStoryRibbonShown,
      sessions,
    };
  },
)(LeftMain));
