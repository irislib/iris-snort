import "./Note.css";
import { ReactNode } from "react";
import { EventKind, NostrEvent, TaggedNostrEvent } from "@snort/system";
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
import EventDB from "@/Cache/EventDB";

export interface NoteProps {
  data?: TaggedNostrEvent;
  id?: string;
  className?: string;
  related: readonly TaggedNostrEvent[];
  highlight?: boolean;
  ignoreModeration?: boolean;
  onClick?: (e: TaggedNostrEvent) => void;
  depth?: number;
  searchedValue?: string;
  threadChains?: Map<string, Array<NostrEvent>>;
  context?: ReactNode;
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

export default function Note(props: NoteProps) {
  let ev = props.data;
  const { id, className } = props;

  if (!id && !ev) {
    throw new Error("Note: id or data is required");
  }

  if (id) {
    ev = EventDB.get(id);
  }

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
      content = <NoteInner {...props} />;
  }

  return <ErrorBoundary>{content}</ErrorBoundary>;
}
