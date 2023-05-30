import "./Nip05.css";
import { HexKey } from "System";

import Icon from "Icons/Icon";
import { useUserProfile } from "Hooks/useUserProfile";

export function useIsVerified(pubkey: HexKey, bypassCheck?: boolean) {
  const profile = useUserProfile(pubkey);
  return { isVerified: bypassCheck || profile?.isNostrAddressValid };
}

export interface Nip05Params {
  nip05?: string;
  pubkey: HexKey;
  verifyNip?: boolean;
}

const Nip05 = ({ nip05, pubkey, verifyNip = true }: Nip05Params) => {
  const [name, domain] = nip05 ? nip05.split("@") : [];
  const isDefaultUser = name === "_";
  const { isVerified } = useIsVerified(pubkey, !verifyNip);

  return (
    <div className={`flex nip05${!isVerified ? " failed" : ""}`}>
      {!isDefaultUser && isVerified && <span className="nick">{`${name}@`}</span>}
      {isVerified && (
        <>
          <span className="domain" data-domain={domain?.toLowerCase()}>
            {domain}
          </span>
          <Icon name="badge" className="badge" size={16} />
        </>
      )}
    </div>
  );
};

export default Nip05;
