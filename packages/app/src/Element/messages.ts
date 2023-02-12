import { defineMessages } from "react-intl";

export default defineMessages({
  Cancel: { defaultMessage: "Cancel" },
  Reply: { defaultMessage: "Reply" },
  Send: { defaultMessage: "Send" },
  NotePlaceholder: { defaultMessage: "What's on your mind?" },
  Back: { defaultMessage: "Back" },
  Block: { defaultMessage: "Block" },
  Unblock: { defaultMessage: "Unblock" },
  MuteCount: { defaultMessage: "{n} muted" },
  Mute: { defaultMessage: "Mute" },
  MutedAuthor: { defaultMessage: "This author has been muted" },
  Others: { defaultMessage: ` & {n} {n, plural, =1 {other} other {others}}` },
  Show: { defaultMessage: "Show" },
  Delete: { defaultMessage: "Delete" },
  Deleted: { defaultMessage: "Deleted" },
  Unmute: { defaultMessage: "Unmute" },
  MuteAll: { defaultMessage: "Mute all" },
  BlockCount: { defaultMessage: "{n} blocked" },
  JustNow: { defaultMessage: "Just now" },
  Follow: { defaultMessage: "Follow" },
  FollowAll: { defaultMessage: "Follow all" },
  Unfollow: { defaultMessage: "Unfollow" },
  FollowerCount: { defaultMessage: "{n} followers" },
  FollowingCount: { defaultMessage: "Follows {n}" },
  FollowsYou: { defaultMessage: "follows you" },
  Invoice: { defaultMessage: "Lightning Invoice" },
  PayInvoice: { defaultMessage: "Pay Invoice" },
  Expired: { defaultMessage: "Expired" },
  Pay: { defaultMessage: "Pay" },
  Paid: { defaultMessage: "Paid" },
  Loading: { defaultMessage: "Loading..." },
  Logout: { defaultMessage: "Logout" },
  ShowMore: { defaultMessage: "Show more" },
  TranslateTo: { defaultMessage: "Translate to {lang}" },
  TranslatedFrom: { defaultMessage: "Translated from {lang}" },
  TranslationFailed: { defaultMessage: "Translation failed" },
  UnknownEventKind: { defaultMessage: "Unknown event kind: {kind}" },
  ConfirmDeletion: { defaultMessage: `Are you sure you want to delete {id}` },
  ConfirmRepost: { defaultMessage: `Are you sure you want to repost: {id}` },
  Reactions: { defaultMessage: "Reactions" },
  ReactionsCount: { defaultMessage: "Reactions ({n})" },
  Share: { defaultMessage: "Share" },
  CopyID: { defaultMessage: "Copy ID" },
  CopyJSON: { defaultMessage: "Copy Event JSON" },
  Dislike: { defaultMessage: "{n} Dislike" },
  DislikeAction: { defaultMessage: "Dislike" },
  Sats: { defaultMessage: `{n} {n, plural, =1 {sat} other {sats}}` },
  Zapped: { defaultMessage: "zapped" },
  OthersZapped: { defaultMessage: `{n, plural, =0 {} =1 {zapped} other {zapped}}` },
  Likes: { defaultMessage: "Likes ({n})" },
  Zaps: { defaultMessage: "Zaps ({n})" },
  Dislikes: { defaultMessage: "Dislikes ({n})" },
  Reposts: { defaultMessage: "Reposts ({n})" },
  NoteToSelf: { defaultMessage: "Note to Self" },
  Read: { defaultMessage: "Read" },
  Write: { defaultMessage: "Write" },
  Seconds: { defaultMessage: "{n} secs" },
  Milliseconds: { defaultMessage: "{n} ms" },
  ShowLatest: { defaultMessage: "Show latest {n} notes" },
  LNURLFail: { defaultMessage: "Failed to load LNURL service" },
  InvoiceFail: { defaultMessage: "Failed to load invoice" },
  Custom: { defaultMessage: "Custom" },
  Confirm: { defaultMessage: "Confirm" },
  ZapAmount: { defaultMessage: "Zap amount in sats" },
  Comment: { defaultMessage: "Comment" },
  ZapTarget: { defaultMessage: "Zap {target} {n} sats" },
  ZapSats: { defaultMessage: "Zap {n} sats" },
  OpenWallet: { defaultMessage: "Open Wallet" },
  SendZap: { defaultMessage: "Send zap" },
  SendSats: { defaultMessage: "Send sats" },
  ToTarget: { defaultMessage: "{action} to {target}" },
  ShowReplies: { defaultMessage: "Show replies" },
  TooShort: { defaultMessage: "name too short" },
  TooLong: { defaultMessage: "name too long" },
  Regex: { defaultMessage: "name has disallowed characters" },
  Registered: { defaultMessage: "name is registered" },
  Disallowed: { defaultMessage: "name is blocked" },
  DisalledLater: { defaultMessage: "name will be available later" },
  BuyNow: { defaultMessage: "Buy Now" },
  NotAvailable: { defaultMessage: "Not available:" },
  Buying: { defaultMessage: "Buying {item}" },
  OrderPaid: { defaultMessage: "Order Paid!" },
  NewNip: { defaultMessage: "Your new NIP-05 handle is:" },
  ActivateNow: { defaultMessage: "Activate Now" },
  AddToProfile: { defaultMessage: "Add to Profile" },
  AccountPage: { defaultMessage: "account page" },
  AccountSupport: { defaultMessage: "Account Support" },
  GoTo: { defaultMessage: "Go to" },
  FindMore: { defaultMessage: "Find out more info about {service} at {link}" },
  SavePassword: {
    defaultMessage: "Please make sure to save the following password in order to manage your handle in the future",
  },
  Handle: { defaultMessage: "Handle" },
  Pin: { defaultMessage: "Pin" },
  Pinned: { defaultMessage: "Pinned" },
  Bookmark: { defaultMessage: "Bookmark" },
  Bookmarks: { defaultMessage: "Bookmarks" },
  BookmarksCount: { defaultMessage: "Bookmarks ({n})" },
  Bookmarked: { defaultMessage: "Saved" },
  All: { defaultMessage: "All" },
  ConfirmUnbookmark: { defaultMessage: "Are you sure you want to remove this note from bookmarks?" },
  ConfirmUnpin: { defaultMessage: "Are you sure you want to unpin this note?" },
  ReactionsLink: { defaultMessage: "{n} Reactions" },
});
