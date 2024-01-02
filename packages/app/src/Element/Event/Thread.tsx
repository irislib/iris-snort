import { useParams } from "react-router-dom";
import { NostrPrefix, parseNostrLink } from "@snort/system";
import Note from "@/Element/Event/Note";

export function ThreadRoute({ id }: { id?: string }) {
  const params = useParams();
  const resolvedId = id ?? params.id;
  const link = parseNostrLink(resolvedId ?? "", NostrPrefix.Note);

  return (
    <Note
      id={link.id}
      related={[]}
      options={{ showReactionsLink: true, showMediaSpotlight: true, isRoot: true }}
      threadChains={new Map()}
      showReplies={Infinity}
      showRepliedMessage={true}
    />
  );
}
