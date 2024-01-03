import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/Element/Modal";
import Icon from "@/Icons/Icon";
import ProxyImg from "@/Element/ProxyImg";
import useImgProxy from "@/Hooks/useImgProxy";

interface SpotlightMediaProps {
  media: Array<string>;
  idx: number;
  className: string;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

const videoSuffixes = ["mp4", "webm", "ogg", "mov", "avi", "mkv"];

export function SpotlightMedia(props: SpotlightMediaProps) {
  const { proxy } = useImgProxy();
  const [idx, setIdx] = useState(props.idx);

  const image = useMemo(() => {
    return props.media.at(idx % props.media.length);
  }, [idx, props]);

  const dec = useCallback(() => {
    if (idx === 0 && props.onPrev) {
      props.onPrev();
    } else {
      setIdx(s => (s - 1 + props.media.length) % props.media.length);
    }
  }, [idx, props.onPrev, props.media.length]); // Add dependencies

  const inc = useCallback(() => {
    if (idx === props.media.length - 1 && props.onNext) {
      props.onNext();
    } else {
      setIdx(s => (s + 1) % props.media.length);
    }
  }, [idx, props.onNext, props.media.length]); // Add dependencies

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp": {
          e.preventDefault();
          dec();
          break;
        }
        case "ArrowRight":
        case "ArrowDown": {
          e.preventDefault();
          inc();
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dec, inc]); // Now dec and inc are stable

  const isVideo = useMemo(() => {
    return image && videoSuffixes.some(suffix => image.endsWith(suffix));
  }, [image]);

  const mediaEl = useMemo(() => {
    if (image && isVideo) {
      return (
        <video
          src={image}
          poster={proxy(image)}
          autoPlay={true}
          loop={true}
          controls={true}
          className="max-h-screen max-w-full w-full"
        />
      );
    } else {
      return <ProxyImg src={image} className="max-h-screen max-w-full w-full object-contain" />;
    }
  }, [image, isVideo]);

  const onClickBg = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  const hasMultiple = props.media.length > 1;
  const hasPrev = hasMultiple || props.onPrev;
  const hasNext = hasMultiple || props.onNext;

  return (
    <div className="select-none relative h-screen flex items-center flex-1 justify-center" onClick={onClickBg}>
      {mediaEl}
      <div className="absolute flex flex-row items-center gap-4 left-0 top-0 p-4">
        <span
          className="p-2 bg-bg-color rounded-full cursor-pointer opacity-80 hover:opacity-70"
          onClick={props.onClose}>
          <Icon name="x-close" size={24} />
        </span>
      </div>
      <div className="absolute flex flex-row items-center gap-4 right-0 top-0 p-4">
        {props.media.length > 1 && `${idx + 1}/${props.media.length}`}
      </div>
      {hasPrev && (
        <span
          className="absolute left-0 p-2 top-1/2 rotate-180 cursor-pointer opacity-80 hover:opacity-60"
          onClick={e => {
            e.stopPropagation();
            dec();
          }}>
          <Icon name="arrowFront" size={24} />
        </span>
      )}
      {hasNext && (
        <span
          className="absolute right-0 p-2 top-1/2 cursor-pointer opacity-80 hover:opacity-60"
          onClick={e => {
            e.stopPropagation();
            inc();
          }}>
          <Icon name="arrowFront" size={24} />
        </span>
      )}
    </div>
  );
}

export function SpotlightMediaModal(props: SpotlightMediaProps) {
  const onClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    props.onClose();
  };
  return (
    <Modal
      id="spotlight"
      onClick={props.onClose}
      onClose={onClose}
      className="spotlight"
      bodyClassName="h-screen w-screen flex items-center justify-center">
      <SpotlightMedia {...props} />
    </Modal>
  );
}
