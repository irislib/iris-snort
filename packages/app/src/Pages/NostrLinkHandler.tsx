import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { fetchNip05Pubkey } from "@snort/shared";
import Spinner from "@/Icons/Spinner";
import ProfilePage from "@/Pages/Profile/ProfilePage";
import { ThreadRoute } from "@/Element/Event/Thread";
import { GenericFeed } from "@/Element/Feed/Generic";
import { NostrPrefix, tryParseNostrLink } from "@snort/system";
import { FormattedMessage } from "react-intl";

export default function NostrLinkHandler() {
  const { state } = useLocation();
  const { link } = useParams();

  const nostrLink = useMemo(() => tryParseNostrLink(link), [link]);
  const [nip05PubKey, setNip05PubKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNip05PubKey(null);
    if (!nostrLink) {
      setLoading(true);
      fetchNip05Pubkey(link, CONFIG.nip05Domain)
        .then(k => {
          setNip05PubKey(k || null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [link, nostrLink]);

  if (nip05PubKey) {
    return <ProfilePage key={link} id={nip05PubKey} state={state} />;
  }

  if (nostrLink) {
    switch (nostrLink.type) {
      case NostrPrefix.Event:
      case NostrPrefix.Note:
      case NostrPrefix.Address:
        return <ThreadRoute key={link} id={nostrLink.encode()} />;
      case NostrPrefix.PublicKey:
      case NostrPrefix.Profile:
        return <ProfilePage key={link} id={nostrLink.encode()} state={state} />;
      case NostrPrefix.Req:
        return <GenericFeed key={link} link={nostrLink} />;
    }
  } else {
    return state ? <ProfilePage key={link} state={state} /> : null;
  }

  if (loading) {
    return <Spinner width={50} height={50} />;
  }

  return (
    <div className="flex items-center">
      <b className="error">
        <FormattedMessage defaultMessage="Nothing found :/" id="oJ+JJN" />
      </b>
    </div>
  );
}
