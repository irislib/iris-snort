import "./Timeline.css";
import { ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EventKind, NostrEvent, NostrLink, TaggedNostrEvent } from "@snort/system";
import { unixNow } from "@snort/shared";
import { SnortContext, useReactions } from "@snort/system-react";

import { dedupeByPubkey, findTag } from "@/SnortUtils";
import useModeration from "@/Hooks/useModeration";
import { FollowsFeed } from "@/Cache";
import { LiveStreams } from "@/Element/LiveStreams";
import useLogin from "@/Hooks/useLogin";
import { ShowMoreInView } from "@/Element/Event/ShowMore";
import { TimelineRenderer } from "@/Element/Feed/TimelineRenderer";
import { DisplayAs, DisplayAsSelector } from "@/Element/Feed/DisplayAsSelector";
import EventDB from "@/Cache/EventDB";

export interface TimelineFollowsProps {
  postsOnly: boolean;
  liveStreams?: boolean;
  noteFilter?: (ev: NostrEvent) => boolean;
  noteRenderer?: (ev: NostrEvent) => ReactNode;
  noteOnClick?: (ev: NostrEvent) => void;
  displayAs?: DisplayAs;
  showDisplayAsSelector?: boolean;
}

/**
 * A list of notes by "subject"
 */
const TimelineFollows = (props: TimelineFollowsProps) => {
  const login = useLogin();
  const displayAsInitial = props.displayAs ?? login.feedDisplayAs ?? "list";
  const [displayAs, setDisplayAs] = useState<DisplayAs>(displayAsInitial);
  const [latest, setLatest] = useState(unixNow());
  const feed = EventDB.findArray({ kinds: [1], authors: login.follows.item, limit: 100, until: latest });
  const reactions = useReactions(
    "follows-feed-reactions",
    feed.map(a => NostrLink.fromEvent(a)),
    undefined,
    true,
  );
  const system = useContext(SnortContext);
  const { muted, isEventMuted } = useModeration();

  const oldest = useMemo(() => feed.at(-1)?.created_at, [feed]);

  const postsOnly = useCallback(
    (a: NostrEvent) => (props.postsOnly ? !a.tags.some(b => b[0] === "e" || b[0] === "a") : true),
    [props.postsOnly],
  );

  const filterPosts = useCallback(
    (nts: Array<TaggedNostrEvent>) => {
      const a = nts.filter(a => a.kind !== EventKind.LiveEvent);
      return a
        ?.filter(postsOnly)
        .filter(a => !isEventMuted(a) && login.follows.item.includes(a.pubkey) && (props.noteFilter?.(a) ?? true));
    },
    [postsOnly, muted, login.follows.timestamp],
  );

  // const mixin = useHashtagsFeed();
  const mainFeed = useMemo(() => {
    return filterPosts((feed ?? []).filter(a => a.created_at <= latest));
  }, [feed, filterPosts, latest, login.follows.timestamp]);

  /* TODO add hashtags back
  const findHashTagContext = (a: NostrEvent) => {
    const tag = a.tags.filter(a => a[0] === "t").find(a => login.tags.item.includes(a[1].toLowerCase()))?.[1];
    return tag;
  };

  const mixinFiltered = useMemo(() => {
    const mainFeedIds = new Set(mainFeed.map(a => a.id));
    return (mixin.data.data ?? [])
      .filter(a => !mainFeedIds.has(a.id) && postsOnly(a) && !isEventMuted(a))
      .filter(a => a.tags.filter(a => a[0] === "t").length < 5)
      .filter(a => !oldest || a.created_at >= oldest)
      .map(
        a =>
          ({
            ...a,
            context: findHashTagContext(a),
          }) as TaggedNostrEvent,
      );
  }, [mixin, mainFeed, postsOnly, isEventMuted]);

   */

  const latestFeed = useMemo(() => {
    return filterPosts((feed ?? []).filter(a => a.created_at > latest));
  }, [feed, latest]);

  const liveStreams = useMemo(() => {
    return (feed ?? []).filter(a => a.kind === EventKind.LiveEvent && findTag(a, "status") === "live");
  }, [feed]);

  const latestAuthors = useMemo(() => {
    return dedupeByPubkey(feed).map(e => e.pubkey);
  }, [latestFeed]);

  function onShowLatest(scrollToTop = false) {
    setLatest(unixNow());
    if (scrollToTop) {
      window.scrollTo(0, 0);
    }
  }

  return (
    <>
      {(props.liveStreams ?? true) && <LiveStreams evs={liveStreams} />}
      <DisplayAsSelector
        show={props.showDisplayAsSelector}
        activeSelection={displayAs}
        onSelect={(displayAs: DisplayAs) => setDisplayAs(displayAs)}
      />
      <TimelineRenderer
        frags={[{ events: mainFeed, refTime: latest }]}
        related={reactions.data ?? []}
        latest={latestAuthors}
        showLatest={t => onShowLatest(t)}
        noteOnClick={props.noteOnClick}
        noteRenderer={props.noteRenderer}
        noteContext={e => {
          if (typeof e.context === "string") {
            return <Link to={`/t/${e.context}`}>{`#${e.context}`}</Link>;
          }
        }}
        displayAs={displayAs}
      />
      {feed.length > 0 && (
        <ShowMoreInView onClick={async () => await FollowsFeed.loadMore(system, login, oldest ?? unixNow())} />
      )}
    </>
  );
};

export default TimelineFollows;
