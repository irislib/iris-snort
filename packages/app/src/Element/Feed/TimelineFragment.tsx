import { ReactNode, useCallback } from "react";
import { TaggedNostrEvent } from "@snort/system";

import Note from "@/Element/Event/Note";
import { findTag } from "@/SnortUtils";

export interface TimelineFragment {
  events: Array<TaggedNostrEvent>;
  refTime: number;
  title?: ReactNode;
}

export interface TimelineFragProps {
  frag: TimelineFragment;
  related: Array<TaggedNostrEvent>;
  index: number;
  noteRenderer?: (ev: TaggedNostrEvent) => ReactNode;
  noteOnClick?: (ev: TaggedNostrEvent) => void;
  noteContext?: (ev: TaggedNostrEvent) => ReactNode;
}

export function TimelineFragment(props: TimelineFragProps) {
  const relatedFeed = useCallback(
    (id: string) => {
      return props.related.filter(a => findTag(a, "e") === id);
    },
    [props.related],
  );
  return (
    <>
      {props.frag.title}
      {props.frag.events.map(
        e =>
          props.noteRenderer?.(e) ?? (
            <Note
              id={e.id}
              related={relatedFeed(e.id)}
              key={e.id}
              depth={0}
              onClick={props.noteOnClick}
              context={props.noteContext?.(e)}
              waitUntilInView={props.index > 5}
              options={{
                truncate: true,
              }}
              waitUntilInView={props.index > 10}
            />
          ),
      )}
    </>
  );
}
