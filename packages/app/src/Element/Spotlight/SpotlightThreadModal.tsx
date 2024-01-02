import Modal from "@/Element/Modal";
import { SpotlightMedia } from "@/Element/Spotlight/SpotlightMedia";
import { NostrLink, TaggedNostrEvent } from "@snort/system";
import getEventMedia from "@/Element/Event/getEventMedia";
import Note from "@/Element/Event/Note";
import EventDB from "@/Cache/InMemoryDB";

interface SpotlightThreadModalProps {
  thread?: NostrLink;
  event?: TaggedNostrEvent;
  className?: string;
  onClose?: () => void;
  onBack?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function SpotlightThreadModal(props: SpotlightThreadModalProps) {
  const onClose = () => props.onClose?.();
  const onClickBg = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!props.thread && !props.event) {
    throw new Error("SpotlightThreadModal requires either thread or event");
  }

  const link = props.event ? NostrLink.fromEvent(props.event) : props.thread;

  const event = props.event || EventDB.get(link?.id);

  if (!event) {
    return null;
  }

  return (
    <Modal className={props.className} onClose={onClose} bodyClassName={"flex flex-1"}>
      <div className="flex flex-row h-screen w-screen">
        <div className="flex w-full md:w-2/3 items-center justify-center overflow-hidden" onClick={onClickBg}>
          <SpotlightFromEvent event={event} onClose={onClose} onNext={props.onNext} onPrev={props.onPrev} />
        </div>
        <div className="hidden md:flex w-1/3 min-w-[400px] flex-shrink-0 overflow-y-auto bg-bg-color">
          <Note id={link?.id} options={{ isRoot: true }} />
        </div>
      </div>
    </Modal>
  );
}

interface SpotlightFromEventProps {
  event: TaggedNostrEvent;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

function SpotlightFromEvent({ event, onClose, onNext, onPrev }: SpotlightFromEventProps) {
  const media = getEventMedia(event);
  return (
    <SpotlightMedia
      className="w-full"
      media={media.map(a => a.content)}
      idx={0}
      onClose={onClose}
      onNext={onNext}
      onPrev={onPrev}
    />
  );
}
