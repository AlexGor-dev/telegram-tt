import '../../global/actions/all';

import type { FC } from '../../lib/teact/teact';
import React, {
  memo, useEffect, useLayoutEffect,
  useRef, useState,
} from '../../lib/teact/teact';
import { addExtraClass } from '../../lib/teact/teact-dom';
import { getActions, getGlobal, withGlobal } from '../../global';

import type {
  ApiChat,
  ApiChatFolder,
  ApiMessage,
  ApiUser,
} from '../../api/types';
import type { ApiLimitTypeWithModal, TabState } from '../../global/types';
import type { LangCode } from '../../types';
import { ElectronEvent } from '../../types/electron';

import {
  BASE_EMOJI_KEYWORD_LANG, DEBUG, INACTIVE_MARKER,
} from '../../config';
import { requestNextMutation } from '../../lib/fasterdom/fasterdom';
import {
  selectCanAnimateInterface,
  selectChatFolder,
  selectChatMessage,
  selectCurrentMessageList,
  selectIsCurrentUserPremium,
  selectIsForwardModalOpen,
  selectIsMediaViewerOpen,
  selectIsReactionPickerOpen,
  selectIsRightColumnShown,
  selectIsServiceChatReady,
  selectIsStoryViewerOpen,
  selectPerformanceSettingsValue,
  selectTabState,
  selectUser,
} from '../../global/selectors';
import buildClassName from '../../util/buildClassName';
import { waitForTransitionEnd } from '../../util/cssAnimationEndListeners';
import { processDeepLink } from '../../util/deeplink';
import { Bundles, loadBundle } from '../../util/moduleLoader';
import { parseInitialLocationHash, parseLocationHash } from '../../util/routing';
import updateIcon from '../../util/updateIcon';
import { IS_ANDROID, IS_ELECTRON } from '../../util/windowEnvironment';

import useInterval from '../../hooks/schedulers/useInterval';
import useTimeout from '../../hooks/schedulers/useTimeout';
import useAppLayout from '../../hooks/useAppLayout';
import useForceUpdate from '../../hooks/useForceUpdate';
import { dispatchHeavyAnimationEvent } from '../../hooks/useHeavyAnimationCheck';
import useLastCallback from '../../hooks/useLastCallback';
import usePreventPinchZoomGesture from '../../hooks/usePreventPinchZoomGesture';
import useShowTransition from '../../hooks/useShowTransition';
import useSyncEffect from '../../hooks/useSyncEffect';
import useBackgroundMode from '../../hooks/window/useBackgroundMode';
import useBeforeUnload from '../../hooks/window/useBeforeUnload';
import { useFullscreenStatus } from '../../hooks/window/useFullscreen';

import ActiveCallHeader from '../calls/ActiveCallHeader.async';
import GroupCall from '../calls/group/GroupCall.async';
import PhoneCall from '../calls/phone/PhoneCall.async';
import RatePhoneCallModal from '../calls/phone/RatePhoneCallModal.async';
import CustomEmojiSetsModal from '../common/CustomEmojiSetsModal.async';
import DeleteMessageModal from '../common/DeleteMessageModal.async';
import StickerSetModal from '../common/StickerSetModal.async';
import UnreadCount from '../common/UnreadCounter';
import LeftColumn from '../left/LeftColumn';
import MediaViewer from '../mediaViewer/MediaViewer.async';
import AudioPlayer from '../middle/AudioPlayer';
import ReactionPicker from '../middle/message/reactions/ReactionPicker.async';
import MessageListHistoryHandler from '../middle/MessageListHistoryHandler';
import MiddleColumn from '../middle/MiddleColumn';
import ModalContainer from '../modals/ModalContainer';
import StarGiftInfoModal from '../modals/stars/StarGiftInfoModal';
import PaymentModal from '../payment/PaymentModal.async';
import ReceiptModal from '../payment/ReceiptModal.async';
import RightColumn from '../right/RightColumn';
import StoryViewer from '../story/StoryViewer.async';
import AttachBotRecipientPicker from './AttachBotRecipientPicker.async';
import BotTrustModal from './BotTrustModal.async';
import ConfettiContainer from './ConfettiContainer';
import DeleteFolderDialog from './DeleteFolderDialog.async';
import Dialogs from './Dialogs.async';
import DownloadManager from './DownloadManager';
import DraftRecipientPicker from './DraftRecipientPicker.async';
import ForwardRecipientPicker from './ForwardRecipientPicker.async';
import GameModal from './GameModal';
import HistoryCalendar from './HistoryCalendar.async';
import NewContactModal from './NewContactModal.async';
import Notifications from './Notifications.async';
import PremiumLimitReachedModal from './premium/common/PremiumLimitReachedModal.async';
import GiveawayModal from './premium/GiveawayModal.async';
import PremiumGiftingPickerModal from './premium/PremiumGiftingPickerModal.async';
import PremiumMainModal from './premium/PremiumMainModal.async';
import StarsGiftingPickerModal from './premium/StarsGiftingPickerModal.async';
import SafeLinkModal from './SafeLinkModal.async';

import './Main.scss';

export interface OwnProps {
  isMobile?: boolean;
}

type StateProps = {
  isMasterTab?: boolean;
  chat?: ApiChat;
  currentUserId?: string;
  isLeftColumnOpen: boolean;
  isMiddleColumnOpen: boolean;
  isRightColumnOpen: boolean;
  isMediaViewerOpen: boolean;
  isStoryViewerOpen: boolean;
  isForwardModalOpen: boolean;
  hasNotifications: boolean;
  hasDialogs: boolean;
  audioMessage?: ApiMessage;
  safeLinkModalUrl?: string;
  isHistoryCalendarOpen: boolean;
  shouldSkipHistoryAnimations?: boolean;
  openedStickerSetShortName?: string;
  openedCustomEmojiSetIds?: string[];
  activeGroupCallId?: string;
  isServiceChatReady?: boolean;
  language?: LangCode;
  wasTimeFormatSetManually?: boolean;
  isPhoneCallActive?: boolean;
  addedSetIds?: string[];
  addedCustomEmojiIds?: string[];
  newContactUserId?: string;
  newContactByPhoneNumber?: boolean;
  openedGame?: TabState['openedGame'];
  gameTitle?: string;
  isRatePhoneCallModalOpen?: boolean;
  isPremiumModalOpen?: boolean;
  botTrustRequest?: TabState['botTrustRequest'];
  botTrustRequestBot?: ApiUser;
  requestedAttachBotInChat?: TabState['requestedAttachBotInChat'];
  requestedDraft?: TabState['requestedDraft'];
  limitReached?: ApiLimitTypeWithModal;
  deleteFolderDialog?: ApiChatFolder;
  isPaymentModalOpen?: boolean;
  isReceiptModalOpen?: boolean;
  isReactionPickerOpen: boolean;
  isAppendModalOpen?: boolean;
  isGiveawayModalOpen?: boolean;
  isDeleteMessageModalOpen?: boolean;
  isPremiumGiftingPickerModal?: boolean;
  isStarsGiftingPickerModal?: boolean;
  isStarGiftInfoModal?: boolean;
  isCurrentUserPremium?: boolean;
  noRightColumnAnimation?: boolean;
  withInterfaceAnimations?: boolean;
  isSynced?: boolean;
};

const APP_OUTDATED_TIMEOUT_MS = 5 * 60 * 1000; // 5 min
const CALL_BUNDLE_LOADING_DELAY_MS = 5000; // 5 sec

// eslint-disable-next-line @typescript-eslint/naming-convention
let DEBUG_isLogged = false;

const Main: FC<OwnProps & StateProps> = ({
  isMobile,
  isLeftColumnOpen,
  isMiddleColumnOpen,
  isRightColumnOpen,
  isMediaViewerOpen,
  isStoryViewerOpen,
  isForwardModalOpen,
  hasNotifications,
  hasDialogs,
  audioMessage,
  activeGroupCallId,
  safeLinkModalUrl,
  isHistoryCalendarOpen,
  shouldSkipHistoryAnimations,
  limitReached,
  openedStickerSetShortName,
  openedCustomEmojiSetIds,
  isServiceChatReady,
  withInterfaceAnimations,
  language,
  wasTimeFormatSetManually,
  addedSetIds,
  addedCustomEmojiIds,
  isPhoneCallActive,
  newContactUserId,
  newContactByPhoneNumber,
  openedGame,
  gameTitle,
  isRatePhoneCallModalOpen,
  botTrustRequest,
  botTrustRequestBot,
  requestedAttachBotInChat,
  requestedDraft,
  isPremiumModalOpen,
  isGiveawayModalOpen,
  isDeleteMessageModalOpen,
  isPremiumGiftingPickerModal,
  isStarsGiftingPickerModal,
  isStarGiftInfoModal,
  isPaymentModalOpen,
  isReceiptModalOpen,
  isReactionPickerOpen,
  isCurrentUserPremium,
  deleteFolderDialog,
  isMasterTab,
  noRightColumnAnimation,
  isSynced,
  currentUserId,
}) => {
  const {
    initMain,
    loadAnimatedEmojis,
    loadBirthdayNumbersStickers,
    loadNotificationSettings,
    loadNotificationExceptions,
    updateIsOnline,
    onTabFocusChange,
    loadTopInlineBots,
    loadEmojiKeywords,
    loadCountryList,
    loadAvailableReactions,
    loadStickerSets,
    loadPremiumGifts,
    loadDefaultTopicIcons,
    loadAddedStickers,
    loadFavoriteStickers,
    loadDefaultStatusIcons,
    ensureTimeFormat,
    closeStickerSetModal,
    closeCustomEmojiSets,
    checkVersionNotification,
    loadConfig,
    loadAppConfig,
    loadAttachBots,
    loadContactList,
    loadCustomEmojis,
    loadGenericEmojiEffects,
    closePaymentModal,
    clearReceipt,
    checkAppVersion,
    openThread,
    toggleLeftColumn,
    loadRecentEmojiStatuses,
    updatePageTitle,
    loadTopReactions,
    loadRecentReactions,
    loadDefaultTagReactions,
    loadFeaturedEmojiStickers,
    setIsElectronUpdateAvailable,
    loadAuthorizations,
    loadPeerColors,
    loadSavedReactionTags,
    loadTimezones,
    loadQuickReplies,
    loadStarStatus,
    loadAvailableEffects,
    loadTopBotApps,
  } = getActions();

  if (DEBUG && !DEBUG_isLogged) {
    DEBUG_isLogged = true;
    // eslint-disable-next-line no-console
    console.log('>>> RENDER MAIN');
  }

  // Preload Calls bundle to initialize sounds for iOS
  useTimeout(() => {
    void loadBundle(Bundles.Calls);
  }, CALL_BUNDLE_LOADING_DELAY_MS);

  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const leftColumnRef = useRef<HTMLDivElement>(null);

  const { isDesktop } = useAppLayout();
  useEffect(() => {
    if (!isLeftColumnOpen && !isMiddleColumnOpen && !isDesktop) {
      // Always display at least one column
      toggleLeftColumn();
    } else if (isLeftColumnOpen && isMiddleColumnOpen && isMobile) {
      // Can't have two active columns at the same time
      toggleLeftColumn();
    }
  }, [isDesktop, isLeftColumnOpen, isMiddleColumnOpen, isMobile, toggleLeftColumn]);

  useInterval(checkAppVersion, isMasterTab ? APP_OUTDATED_TIMEOUT_MS : undefined, true);

  useEffect(() => {
    if (!IS_ELECTRON) {
      return undefined;
    }

    const removeUpdateAvailableListener = window.electron!.on(ElectronEvent.UPDATE_AVAILABLE, () => {
      setIsElectronUpdateAvailable(true);
    });

    const removeUpdateErrorListener = window.electron!.on(ElectronEvent.UPDATE_ERROR, () => {
      setIsElectronUpdateAvailable(false);
      removeUpdateAvailableListener?.();
    });

    return () => {
      removeUpdateErrorListener?.();
      removeUpdateAvailableListener?.();
    };
  }, []);

  // Initial API calls
  useEffect(() => {
    if (isMasterTab && isSynced) {
      updateIsOnline(true);
      loadConfig();
      loadAppConfig();
      loadPeerColors();
      initMain();
      loadAvailableReactions();
      loadAnimatedEmojis();
      loadNotificationSettings();
      loadNotificationExceptions();
      loadAttachBots();
      loadContactList();
      loadDefaultTopicIcons();
      checkAppVersion();
      loadTopReactions();
      loadRecentReactions();
      loadDefaultTagReactions();
      loadFeaturedEmojiStickers();
      loadTopInlineBots();
      loadEmojiKeywords({ language: BASE_EMOJI_KEYWORD_LANG });
      loadTimezones();
      loadQuickReplies();
      loadStarStatus();
      loadPremiumGifts();
      loadAvailableEffects();
      loadBirthdayNumbersStickers();
      loadGenericEmojiEffects();
      loadSavedReactionTags();
      loadAuthorizations();
      loadTopBotApps();
    }
  }, [isMasterTab, isSynced]);

  // Initial Premium API calls
  useEffect(() => {
    if (isMasterTab && isCurrentUserPremium) {
      loadDefaultStatusIcons();
      loadRecentEmojiStatuses();
    }
  }, [isCurrentUserPremium, isMasterTab]);

  // Language-based API calls
  useEffect(() => {
    if (isMasterTab) {
      if (language !== BASE_EMOJI_KEYWORD_LANG) {
        loadEmojiKeywords({ language: language! });
      }

      loadCountryList({ langCode: language });
    }
  }, [language, isMasterTab]);

  // Re-fetch cached saved emoji for `localDb`
  useEffect(() => {
    if (isMasterTab) {
      loadCustomEmojis({
        ids: Object.keys(getGlobal().customEmojis.byId),
        ignoreCache: true,
      });
    }
  }, [isMasterTab]);

  // Sticker sets
  useEffect(() => {
    if (isMasterTab && isSynced) {
      if (!addedSetIds || !addedCustomEmojiIds) {
        loadStickerSets();
        loadFavoriteStickers();
      }

      if (addedSetIds && addedCustomEmojiIds) {
        loadAddedStickers();
      }
    }
  }, [addedSetIds, addedCustomEmojiIds, isMasterTab, isSynced]);

  // Check version when service chat is ready
  useEffect(() => {
    if (isServiceChatReady && isMasterTab) {
      checkVersionNotification();
    }
  }, [isServiceChatReady, isMasterTab]);

  // Ensure time format
  useEffect(() => {
    if (!wasTimeFormatSetManually) {
      ensureTimeFormat();
    }
  }, [wasTimeFormatSetManually]);

  // Parse deep link
  useEffect(() => {
    if (!isSynced) return;
    const parsedInitialLocationHash = parseInitialLocationHash();
    if (parsedInitialLocationHash?.tgaddr) {
      processDeepLink(decodeURIComponent(parsedInitialLocationHash.tgaddr));
    }
  }, [isSynced]);

  useEffect(() => {
    return window.electron?.on(ElectronEvent.DEEPLINK, (link: string) => {
      processDeepLink(decodeURIComponent(link));
    });
  }, []);

  useEffect(() => {
    const parsedLocationHash = parseLocationHash(currentUserId);
    if (!parsedLocationHash) return;

    openThread({
      chatId: parsedLocationHash.chatId,
      threadId: parsedLocationHash.threadId,
      type: parsedLocationHash.type,
    });
  }, [currentUserId]);

  // Restore Transition slide class after async rendering
  useLayoutEffect(() => {
    const container = containerRef.current!;
    if (container.parentNode!.childElementCount === 1) {
      addExtraClass(container, 'Transition_slide-active');
    }
  }, []);

  const leftColumnTransition = useShowTransition(
    isLeftColumnOpen, undefined, true, undefined, shouldSkipHistoryAnimations, undefined, true,
  );
  const willAnimateLeftColumnRef = useRef(false);
  const forceUpdate = useForceUpdate();

  // Handle opening middle column
  useSyncEffect(([prevIsLeftColumnOpen]) => {
    if (prevIsLeftColumnOpen === undefined || isLeftColumnOpen === prevIsLeftColumnOpen || !withInterfaceAnimations) {
      return;
    }

    willAnimateLeftColumnRef.current = true;

    if (IS_ANDROID) {
      requestNextMutation(() => {
        document.body.classList.toggle('android-left-blackout-open', !isLeftColumnOpen);
      });
    }

    const dispatchHeavyAnimationEnd = dispatchHeavyAnimationEvent();

    waitForTransitionEnd(document.getElementById('MiddleColumn')!, () => {
      dispatchHeavyAnimationEnd();
      willAnimateLeftColumnRef.current = false;
      forceUpdate();
    });
  }, [isLeftColumnOpen, withInterfaceAnimations, forceUpdate]);

  const rightColumnTransition = useShowTransition(
    isRightColumnOpen, undefined, true, undefined, shouldSkipHistoryAnimations, undefined, true,
  );
  const willAnimateRightColumnRef = useRef(false);
  const [isNarrowMessageList, setIsNarrowMessageList] = useState(isRightColumnOpen);

  const isFullscreen = useFullscreenStatus();

  // Handle opening right column
  useSyncEffect(([prevIsMiddleColumnOpen, prevIsRightColumnOpen]) => {
    if (prevIsRightColumnOpen === undefined || isRightColumnOpen === prevIsRightColumnOpen) {
      return;
    }

    if (!prevIsMiddleColumnOpen || noRightColumnAnimation) {
      setIsNarrowMessageList(isRightColumnOpen);
      return;
    }

    willAnimateRightColumnRef.current = true;

    const dispatchHeavyAnimationEnd = dispatchHeavyAnimationEvent();

    waitForTransitionEnd(document.getElementById('RightColumn')!, () => {
      dispatchHeavyAnimationEnd();
      willAnimateRightColumnRef.current = false;
      forceUpdate();
      setIsNarrowMessageList(isRightColumnOpen);
    });
  }, [isMiddleColumnOpen, isRightColumnOpen, noRightColumnAnimation, forceUpdate]);

  const className = buildClassName(
    leftColumnTransition.hasShownClass && 'left-column-shown',
    leftColumnTransition.hasOpenClass && 'left-column-open',
    willAnimateLeftColumnRef.current && 'left-column-animating',
    rightColumnTransition.hasShownClass && 'right-column-shown',
    rightColumnTransition.hasOpenClass && 'right-column-open',
    willAnimateRightColumnRef.current && 'right-column-animating',
    isNarrowMessageList && 'narrow-message-list',
    shouldSkipHistoryAnimations && 'history-animation-disabled',
    isFullscreen && 'is-fullscreen',
  );

  const handleBlur = useLastCallback(() => {
    onTabFocusChange({ isBlurred: true });
  });

  const handleFocus = useLastCallback(() => {
    onTabFocusChange({ isBlurred: false });

    if (!document.title.includes(INACTIVE_MARKER)) {
      updatePageTitle();
    }

    updateIcon(false);
  });

  const handleStickerSetModalClose = useLastCallback(() => {
    closeStickerSetModal();
  });

  const handleCustomEmojiSetsModalClose = useLastCallback(() => {
    closeCustomEmojiSets();
  });

  // Online status and browser tab indicators
  useBackgroundMode(handleBlur, handleFocus, !!IS_ELECTRON);
  useBeforeUnload(handleBlur);
  usePreventPinchZoomGesture(isMediaViewerOpen || isStoryViewerOpen);

  return (
    <div ref={containerRef} id="Main" className={className}>
      <LeftColumn ref={leftColumnRef} />
      <MiddleColumn leftColumnRef={leftColumnRef} isMobile={isMobile} />
      <RightColumn isMobile={isMobile} />
      <MediaViewer isOpen={isMediaViewerOpen} />
      <StoryViewer isOpen={isStoryViewerOpen} />
      <ForwardRecipientPicker isOpen={isForwardModalOpen} />
      <DraftRecipientPicker requestedDraft={requestedDraft} />
      <Notifications isOpen={hasNotifications} />
      <Dialogs isOpen={hasDialogs} />
      {audioMessage && <AudioPlayer key={audioMessage.id} message={audioMessage} noUi />}
      <ModalContainer />
      <SafeLinkModal url={safeLinkModalUrl} />
      <HistoryCalendar isOpen={isHistoryCalendarOpen} />
      <StickerSetModal
        isOpen={Boolean(openedStickerSetShortName)}
        onClose={handleStickerSetModalClose}
        stickerSetShortName={openedStickerSetShortName}
      />
      <CustomEmojiSetsModal
        customEmojiSetIds={openedCustomEmojiSetIds}
        onClose={handleCustomEmojiSetsModalClose}
      />
      {activeGroupCallId && <GroupCall groupCallId={activeGroupCallId} />}
      <ActiveCallHeader isActive={Boolean(activeGroupCallId || isPhoneCallActive)} />
      <NewContactModal
        isOpen={Boolean(newContactUserId || newContactByPhoneNumber)}
        userId={newContactUserId}
        isByPhoneNumber={newContactByPhoneNumber}
      />
      <GameModal openedGame={openedGame} gameTitle={gameTitle} />
      <DownloadManager />
      <ConfettiContainer />
      <PhoneCall isActive={isPhoneCallActive} />
      <UnreadCount isForAppBadge />
      <RatePhoneCallModal isOpen={isRatePhoneCallModalOpen} />
      <BotTrustModal
        bot={botTrustRequestBot}
        type={botTrustRequest?.type}
        shouldRequestWriteAccess={botTrustRequest?.shouldRequestWriteAccess}
      />
      <AttachBotRecipientPicker requestedAttachBotInChat={requestedAttachBotInChat} />
      <MessageListHistoryHandler />
      {isPremiumModalOpen && <PremiumMainModal isOpen={isPremiumModalOpen} />}
      {isGiveawayModalOpen && <GiveawayModal isOpen={isGiveawayModalOpen} />}
      {isPremiumGiftingPickerModal && <PremiumGiftingPickerModal isOpen={isPremiumGiftingPickerModal} />}
      {isStarsGiftingPickerModal && <StarsGiftingPickerModal isOpen={isStarsGiftingPickerModal} />}
      {isStarGiftInfoModal && <StarGiftInfoModal isOpen={isStarGiftInfoModal} />}
      <PremiumLimitReachedModal limit={limitReached} />
      <PaymentModal isOpen={isPaymentModalOpen} onClose={closePaymentModal} />
      <ReceiptModal isOpen={isReceiptModalOpen} onClose={clearReceipt} />
      <DeleteFolderDialog folder={deleteFolderDialog} />
      <ReactionPicker isOpen={isReactionPickerOpen} />
      <DeleteMessageModal isOpen={isDeleteMessageModalOpen} />
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global, { isMobile }): StateProps => {
    const {
      settings: {
        byKey: {
          language, wasTimeFormatSetManually,
        },
      },
      currentUserId,
    } = global;

    const {
      botTrustRequest,
      requestedAttachBotInChat,
      requestedDraft,
      safeLinkModalUrl,
      openedStickerSetShortName,
      openedCustomEmojiSetIds,
      shouldSkipHistoryAnimations,
      openedGame,
      audioPlayer,
      isLeftColumnShown,
      historyCalendarSelectedAt,
      notifications,
      dialogs,
      newContact,
      ratingPhoneCall,
      premiumModal,
      giveawayModal,
      deleteMessageModal,
      giftingModal,
      starsGiftingModal,
      starGiftInfoModal,
      isMasterTab,
      payment,
      limitReachedModal,
      deleteFolderDialogModal,
    } = selectTabState(global);

    const { chatId: audioChatId, messageId: audioMessageId } = audioPlayer;
    const audioMessage = audioChatId && audioMessageId
      ? selectChatMessage(global, audioChatId, audioMessageId)
      : undefined;
    const gameMessage = openedGame && selectChatMessage(global, openedGame.chatId, openedGame.messageId);
    const gameTitle = gameMessage?.content.game?.title;
    const { chatId } = selectCurrentMessageList(global) || {};
    const noRightColumnAnimation = !selectPerformanceSettingsValue(global, 'rightColumnAnimations')
        || !selectCanAnimateInterface(global);

    const deleteFolderDialog = deleteFolderDialogModal ? selectChatFolder(global, deleteFolderDialogModal) : undefined;

    return {
      currentUserId,
      isLeftColumnOpen: isLeftColumnShown,
      isMiddleColumnOpen: Boolean(chatId),
      isRightColumnOpen: selectIsRightColumnShown(global, isMobile),
      isMediaViewerOpen: selectIsMediaViewerOpen(global),
      isStoryViewerOpen: selectIsStoryViewerOpen(global),
      isForwardModalOpen: selectIsForwardModalOpen(global),
      isReactionPickerOpen: selectIsReactionPickerOpen(global),
      hasNotifications: Boolean(notifications.length),
      hasDialogs: Boolean(dialogs.length),
      audioMessage,
      safeLinkModalUrl,
      isHistoryCalendarOpen: Boolean(historyCalendarSelectedAt),
      shouldSkipHistoryAnimations,
      openedStickerSetShortName,
      openedCustomEmojiSetIds,
      isServiceChatReady: selectIsServiceChatReady(global),
      activeGroupCallId: isMasterTab ? global.groupCalls.activeGroupCallId : undefined,
      withInterfaceAnimations: selectCanAnimateInterface(global),
      language,
      wasTimeFormatSetManually,
      isPhoneCallActive: isMasterTab ? Boolean(global.phoneCall) : undefined,
      addedSetIds: global.stickers.added.setIds,
      addedCustomEmojiIds: global.customEmojis.added.setIds,
      newContactUserId: newContact?.userId,
      newContactByPhoneNumber: newContact?.isByPhoneNumber,
      openedGame,
      gameTitle,
      isRatePhoneCallModalOpen: Boolean(ratingPhoneCall),
      botTrustRequest,
      botTrustRequestBot: botTrustRequest && selectUser(global, botTrustRequest.botId),
      requestedAttachBotInChat,
      isCurrentUserPremium: selectIsCurrentUserPremium(global),
      isPremiumModalOpen: premiumModal?.isOpen,
      isGiveawayModalOpen: giveawayModal?.isOpen,
      isDeleteMessageModalOpen: Boolean(deleteMessageModal),
      isPremiumGiftingPickerModal: giftingModal?.isOpen,
      isStarsGiftingPickerModal: starsGiftingModal?.isOpen,
      isStarGiftInfoModal: starGiftInfoModal?.isOpen,
      limitReached: limitReachedModal?.limit,
      isPaymentModalOpen: payment.isPaymentModalOpen,
      isReceiptModalOpen: Boolean(payment.receipt),
      deleteFolderDialog,
      isMasterTab,
      requestedDraft,
      noRightColumnAnimation,
      isSynced: global.isSynced,
    };
  },
)(Main));
