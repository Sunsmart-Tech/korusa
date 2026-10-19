import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  UserPlus,
  Sparkles,
  Bell,
  X,
} from 'lucide-react';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { BackButton } from '../../ui/BackButton';
import {
  dismissNotification,
  fetchNotifications,
  getCurrentUserId,
  markNotificationsRead,
  removeNotificationSubscription,
  subscribeToNotifications,
  type AppNotification,
  type NotificationKind,
} from '../../../lib/notifications';
import { getFriendSuggestions, type FriendSuggestion } from '../../../lib/social';
import { formatRelativeTime } from '../../../lib/time';
import { useUIStore } from '../../../store/uiStore';

type FilterKey = 'all' | 'likes' | 'comments' | 'follows' | 'stories';

// There is no `mentions` chip: @mention notifications do not exist yet, and a tab
// that can only ever be empty is the same fabricated signal as an always-lit badge.
const FILTERS: Array<{ key: FilterKey; kinds: NotificationKind[] | null }> = [
  { key: 'all', kinds: null },
  { key: 'likes', kinds: ['like'] },
  { key: 'comments', kinds: ['comment'] },
  { key: 'follows', kinds: ['follow'] },
  { key: 'stories', kinds: ['story_reaction'] },
];

const kindsFor = (key: FilterKey) => FILTERS.find((f) => f.key === key)?.kinds ?? null;

const NotificationIcon = ({ kind }: { kind: NotificationKind }) => {
  switch (kind) {
    case 'like': return <Heart size={14} className="text-red-500 fill-red-500" />;
    case 'comment': return <MessageCircle size={14} className="text-sun-primary fill-sun-primary" />;
    case 'follow': return <UserPlus size={14} className="text-blue-500" />;
    case 'story_reaction': return <Sparkles size={14} className="text-purple-500" />;
  }
};

const actorName = (notification: AppNotification) =>
  notification.actor.fullName || notification.actor.username || 'Someone';

// The row has to be readable on its own, because it does not open the post - so the
// comment's text and the reaction's emoji travel in the sentence.
const describe = (notification: AppNotification) => {
  switch (notification.kind) {
    case 'like':
      return 'liked your post.';
    case 'comment':
      return notification.preview
        ? `commented: "${notification.preview}"`
        : 'commented on your post.';
    case 'follow':
      return 'started following you.';
    case 'story_reaction':
      return notification.preview
        ? `reacted ${notification.preview} to your story.`
        : 'reacted to your story.';
  }
};

export const NotificationsView = ({ onBack, onExploreClick }: { onBack?: () => void, onExploreClick?: () => void }) => {
  const navigate = useNavigate();
  const { unreadNotifications, setUnreadNotifications } = useUIStore();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [items, setItems] = useState<AppNotification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [people, setPeople] = useState<FriendSuggestion[]>([]);

  // Read by the realtime handler, which must not re-subscribe every time a chip
  // changes: the socket stays up for the life of the page.
  const filterRef = useRef(filter);
  filterRef.current = filter;
  // True once older pages have been loaded. A silent refresh replaces the list with
  // page one, which would throw away what the reader paged in.
  const pagedRef = useRef(false);

  const load = useCallback(async (filterKey: FilterKey, silent = false) => {
    try {
      if (!silent) setLoading(true);
      if (!silent) setErrorMessage('');
      const page = await fetchNotifications({ kinds: kindsFor(filterKey) });
      setItems(page.items);
      setNextCursor(page.nextCursor);
      pagedRef.current = false;
    } catch (error: unknown) {
      if (!silent) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load your activity.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof subscribeToNotifications> | null = null;

    void getCurrentUserId()
      .then((userId) => {
        if (!active) return;
        channel = subscribeToNotifications(
          userId,
          () => {
            if (pagedRef.current) return;
            void load(filterRef.current, true);
          },
          'list',
        );
      })
      .catch(() => { /* signed out; the route guard handles it */ });

    return () => {
      active = false;
      void removeNotificationSubscription(channel);
    };
  }, [load]);

  useEffect(() => {
    // Real people rather than the three invented avatars this footer used to show.
    void getFriendSuggestions(3)
      .then(setPeople)
      .catch(() => setPeople([]));
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchNotifications({ cursor: nextCursor, kinds: kindsFor(filter) });
      setNextCursor(page.nextCursor);
      pagedRef.current = true;
      // Guard against a duplicate on the boundary when two events share a timestamp.
      setItems((previous) => {
        const seen = new Set(previous.map((item) => item.id));
        return [...previous, ...page.items.filter((item) => !seen.has(item.id))];
      });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load older activity.');
    } finally {
      setLoadingMore(false);
    }
  };

  // Optimistic on both counts, so the tint and the badge answer the tap rather than
  // the round trip - the row is navigating away from the page as it happens.
  const openNotification = (notification: AppNotification) => {
    if (!notification.readAt) {
      const now = new Date().toISOString();
      setItems((previous) =>
        previous.map((item) => (item.id === notification.id ? { ...item, readAt: now } : item)),
      );
      setUnreadNotifications(unreadNotifications - 1);
      void markNotificationsRead([notification.id]).catch(() => { /* the badge resyncs on the next event */ });
    }
    navigate(`/profile/${notification.actor.id}`);
  };

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setItems((previous) => previous.map((item) => (item.readAt ? item : { ...item, readAt: now })));
    setUnreadNotifications(0);
    try {
      await markNotificationsRead();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not mark everything read.');
      void load(filter, true);
    }
  };

  const dismiss = async (notification: AppNotification) => {
    setItems((previous) => previous.filter((item) => item.id !== notification.id));
    if (!notification.readAt) setUnreadNotifications(unreadNotifications - 1);
    try {
      await dismissNotification(notification.id);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not dismiss that.');
      void load(filter, true);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col gap-6">
        {onBack && <BackButton onClick={onBack} label="Back" sticky={true} />}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-bold tracking-tight">Activity</h1>
            <p className="text-sun-text-muted text-sm font-medium">
              {unreadNotifications > 0
                ? `${unreadNotifications} unread ${unreadNotifications === 1 ? 'update' : 'updates'}.`
                : 'You are all caught up.'}
            </p>
          </div>
          <div className="flex gap-2">
            {/* Disabled rather than left as a button that does nothing. */}
            <Button
              variant="secondary"
              onClick={() => void markAllRead()}
              disabled={unreadNotifications === 0}
              className="rounded-2xl! px-4 py-2 text-[10px] font-black uppercase tracking-widest"
            >
              Mark all as read
            </Button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {FILTERS.map(({ key }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${
              filter === key
              ? 'bg-sun-primary text-black border-sun-primary shadow-lg shadow-sun-primary/10'
              : 'bg-sun-surface border-sun-border text-sun-text-muted hover:border-white/20'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden border-sun-border/30">
        <div className="divide-y divide-sun-border/30">
          {loading && (
            <div className="p-6 text-sm font-medium text-sun-text-muted">Loading your activity…</div>
          )}

          {errorMessage && (
            <div className="border-b border-red-500/25 bg-red-500/8 p-5 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {!loading && items.length > 0 ? (
              items.map((notification) => (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`p-4 sm:p-6 flex items-start gap-3 sm:gap-4 transition-colors hover:bg-white/5 relative group ${!notification.readAt ? 'bg-sun-primary/5' : ''}`}
                >
                  {/* A button rather than a cursor-pointer div, so the row is
                      focusable and works from the keyboard. It opens the person who
                      did this - the one destination that exists for every type. */}
                  <button
                    type="button"
                    onClick={() => openNotification(notification)}
                    className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-primary/40 sm:gap-4"
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        size="md"
                        src={notification.actor.avatarUrl || undefined}
                        name={actorName(notification)}
                        className="ring-2 ring-transparent group-hover:ring-sun-primary/20 transition-all"
                      />
                      <div className="absolute -bottom-1 -right-1 p-1.5 bg-sun-bg rounded-full border border-sun-border shadow-lg">
                        <NotificationIcon kind={notification.kind} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm text-sun-text-main leading-snug wrap-anywhere">
                        <span className="font-bold text-sun-text-main">{actorName(notification)}</span>{' '}
                        <span className="text-sun-text-muted font-medium">{describe(notification)}</span>
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-sun-text-muted font-black uppercase tracking-widest">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                        {!notification.readAt && <div className="w-1.5 h-1.5 bg-sun-primary rounded-full"></div>}
                      </div>
                    </div>

                    {/* The post's own media, so the row shows which post is meant. */}
                    {notification.postMediaUrl && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-sun-border mt-1 group-hover:scale-105 transition-transform">
                        <img src={notification.postMediaUrl} className="w-full h-full object-cover" alt="" />
                      </div>
                    )}
                  </button>

                  {/* Visible without hover below sm: a touch screen never delivers one,
                      and this is now a real action rather than the decorative overflow
                      menu that used to sit here. */}
                  <button
                    type="button"
                    onClick={() => void dismiss(notification)}
                    aria-label="Dismiss notification"
                    title="Dismiss"
                    className="shrink-0 rounded-lg p-2 text-sun-text-muted transition-all hover:bg-white/5 hover:text-sun-text-main sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ))
            ) : null}
          </AnimatePresence>

          {!loading && !errorMessage && items.length === 0 && (
            <div className="py-20 text-center space-y-6">
               <div className="w-20 h-20 bg-sun-surface border border-sun-border rounded-[2rem] flex items-center justify-center mx-auto text-sun-text-muted/30">
                  <Bell size={40} />
               </div>
               <div className="space-y-2">
                  <h3 className="text-xl font-display font-bold">Quiet for now</h3>
                  <p className="text-sun-text-muted text-xs max-w-xs mx-auto font-medium leading-relaxed">
                    {filter === 'all'
                      ? 'When someone likes, comments, follows or reacts to your story, it shows up here.'
                      : `No ${filter} yet. Stay active to get updates!`}
                  </p>
               </div>
               {filter !== 'all' && (
                 <Button variant="outline" size="sm" onClick={() => setFilter('all')}>View all activity</Button>
               )}
            </div>
          )}
        </div>
      </div>

      {!loading && nextCursor && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-sun-border bg-sun-surface text-sm font-bold text-sun-text-main transition-colors hover:bg-sun-surface-light disabled:opacity-60"
        >
          {loadingMore ? 'Loading…' : 'Load older activity'}
        </button>
      )}

      {/* Suggestions Footer */}
      <footer className="pt-10 flex flex-col items-center gap-4 text-center">
         {people.length > 0 && (
           <div className="flex -space-x-3">
              {people.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => navigate(`/profile/${person.id}`)}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun-primary/40"
                  title={person.full_name || person.username || 'View profile'}
                >
                  <Avatar
                    size="sm"
                    src={person.avatar_url || undefined}
                    name={person.full_name || person.username || 'Member'}
                    className="border-2 border-sun-bg"
                  />
                </button>
              ))}
           </div>
         )}
         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sun-text-muted">Find more people to expert with</p>
         <Button variant="secondary" size="sm" className="!rounded-xl px-6" onClick={onExploreClick}>Explore Wisdom Nodes</Button>
      </footer>
    </div>
  );
};
