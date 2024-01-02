import "./Note.css";
import { ReactNode, useMemo } from "react";
import { EventKind, NostrEvent, NostrLink, TaggedNostrEvent } from "@snort/system";
import { NostrFileElement } from "@/Element/Event/NostrFileHeader";
import ZapstrEmbed from "@/Element/Embed/ZapstrEmbed";
import PubkeyList from "@/Element/Embed/PubkeyList";
import { LiveEvent } from "@/Element/LiveEvent";
import { ZapGoal } from "@/Element/Event/ZapGoal";
import NoteReaction from "@/Element/Event/NoteReaction";
import ProfilePreview from "@/Element/User/ProfilePreview";
import { NoteInner } from "./NoteInner";
import { LongFormText } from "./LongFormText";
import ErrorBoundary from "@/Element/ErrorBoundary";
import EventDB from "@/Cache/LokiDB";
import useThreadFeed from "@/Feed/ThreadFeed";

export interface NoteProps {
  data?: TaggedNostrEvent;
  id?: string;
  className?: string;
  related: readonly TaggedNostrEvent[];
  highlight?: boolean;
  showReplies?: number;
  ignoreModeration?: boolean;
  onClick?: (e: TaggedNostrEvent) => void;
  depth?: number;
  searchedValue?: string;
  threadChains?: Map<string, Array<NostrEvent>>;
  context?: ReactNode;
  showRepliedMessage?: boolean;
  waitUntilInView?: boolean;
  options?: {
    isRoot?: boolean;
    showHeader?: boolean;
    showContextMenu?: boolean;
    showProfileCard?: boolean;
    showTime?: boolean;
    showPinned?: boolean;
    showBookmarked?: boolean;
    showFooter?: boolean;
    showReactionsLink?: boolean;
    showMedia?: boolean;
    canUnpin?: boolean;
    canUnbookmark?: boolean;
    canClick?: boolean;
    showMediaSpotlight?: boolean;
    longFormPreview?: boolean;
    truncate?: boolean;
  };
}

function Replies({ id, showReplies, waitUntilInView }: { id: string; showReplies: number; waitUntilInView?: boolean }) {
  useThreadFeed(NostrLink.fromTag(["e", id])); // maybe there's a better way to do the subscription?
  const replies = EventDB.findArray({ kinds: [1], "#e": [id], limit: showReplies });
  return (
    <div className="flex flex-col">
      {replies.map((reply, index) => (
        <Note
          key={reply.id}
          data={reply}
          related={[]}
          waitUntilInView={waitUntilInView || index > 10}
          showReplies={1}
        />
      ))}
    </div>
  );
}

export default function Note(props: NoteProps) {
  const { id, className, showReplies, waitUntilInView, showRepliedMessage } = props;

  if (!id && !props.data) {
    throw new Error("Note: id or data is required");
  }

  const ev = useMemo(() => {
    if (id) {
      // TODO subscribe
      return EventDB.get(id);
    } else {
      return props.data;
    }
  }, [id, props.data]);

  const replyingTo = useMemo(() => {
    if (!ev) {
      return undefined;
    }
    return ev.tags.find(t => t[0] === "e")?.[1];
  }, [ev]);

  if (!ev) {
    return null;
  }

  let content;
  switch (ev.kind) {
    case EventKind.Repost:
      content = <NoteReaction data={ev} key={ev.id} root={undefined} depth={(props.depth ?? 0) + 1} />;
      break;
    case EventKind.FileHeader:
      content = <NostrFileElement ev={ev} />;
      break;
    case EventKind.ZapstrTrack:
      content = <ZapstrEmbed ev={ev} />;
      break;
    case EventKind.FollowSet:
    case EventKind.ContactList:
      content = <PubkeyList ev={ev} className={className} />;
      break;
    case EventKind.LiveEvent:
      content = <LiveEvent ev={ev} />;
      break;
    case EventKind.SetMetadata:
      content = <ProfilePreview actions={<></>} pubkey={ev.pubkey} />;
      break;
    case 9041: // Assuming 9041 is a valid EventKind
      content = <ZapGoal ev={ev} />;
      break;
    case EventKind.LongFormTextNote:
      content = (
        <LongFormText
          ev={ev}
          related={props.related}
          isPreview={props.options?.longFormPreview ?? false}
          onClick={() => props.onClick?.(ev)}
          truncate={props.options?.truncate}
        />
      );
      break;
    default:
      content = <NoteInner {...props} data={ev} />;
  }

  return (
    <>
      {showRepliedMessage && replyingTo && (
        <Note key={replyingTo} id={replyingTo} related={[]} waitUntilInView={waitUntilInView} />
      )}
      <ErrorBoundary>{content}</ErrorBoundary>
      {showReplies && <Replies id={ev.id} showReplies={showReplies} waitUntilInView={waitUntilInView} />}
    </>
  );
}
