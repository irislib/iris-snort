import "./index.css";
import "@szhsin/react-menu/dist/index.css";
import "./fonts/inter.css";

import {
  compress,
  expand_filter,
  flat_merge,
  get_diff,
  pow,
  schnorr_verify,
  default as wasmInit,
} from "@snort/system-wasm";
import WasmPath from "@snort/system-wasm/pkg/system_wasm_bg.wasm";

import * as Comlink from "comlink";
import { StrictMode } from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouteObject, RouterProvider } from "react-router-dom";
import {
  NostrSystem,
  ProfileLoaderService,
  QueryOptimizer,
  FlatReqFilter,
  ReqFilter,
  PowMiner,
  NostrEvent,
  mapEventToProfile,
  PowWorker,
  encodeTLVEntries,
  socialGraphInstance, TaggedNostrEvent,
} from "@snort/system";
import PowWorkerURL from "@snort/system/src/pow-worker.ts?worker&url";
import { SnortContext } from "@snort/system-react";
import { removeUndefined, throwIfOffline } from "@snort/shared";

import * as serviceWorkerRegistration from "@/serviceWorkerRegistration";
import { IntlProvider } from "@/IntlProvider";
import { getCountry, storeRefCode, unwrap } from "@/SnortUtils";
import Layout from "@/Pages/Layout";
import ProfilePage from "@/Pages/Profile/ProfilePage";
import { RootRoutes, RootTabRoutes } from "@/Pages/Root";
import NotificationsPage from "@/Pages/Notifications/Notifications";
import SettingsRoutes from "@/Pages/settings/Routes";
import ErrorPage from "@/Pages/ErrorPage";
import NostrAddressPage from "@/Pages/NostrAddressPage";
import MessagesPage from "@/Pages/Messages/MessagesPage";
import DonatePage from "@/Pages/DonatePage";
import SearchPage from "@/Pages/SearchPage";
import HelpPage from "@/Pages/HelpPage";
import NostrLinkHandler from "@/Pages/NostrLinkHandler";
import { ThreadRoute } from "@/Element/Event/Thread";
import { SubscribeRoutes } from "@/Pages/subscribe";
import ZapPoolPage from "@/Pages/ZapPool";
import { db } from "@/Db";
import { preload, RelayMetrics, SystemDb, UserCache, UserRelays } from "@/Cache";
import { LoginStore } from "@/Login";
import { SnortDeckLayout } from "@/Pages/DeckLayout";
import FreeNostrAddressPage from "@/Pages/FreeNostrAddressPage";
import { ListFeedPage } from "@/Pages/ListFeedPage";
import { updateRelayConnections } from "@/Hooks/useLoginRelays";
import { AboutPage } from "@/Pages/About";
import { OnboardingRoutes } from "@/Pages/onboarding";
import { setupWebLNWalletConfig } from "@/Wallet/WebLN";
import { Wallets } from "@/Wallet";
import NetworkGraph from "@/Pages/NetworkGraph";
import InMemoryDB from "@/Cache/InMemoryDB";
import IndexedDBWorker from "@/Cache/IndexedDB?worker";
import { addToFuzzySearch } from "@/FuzzySearch";

declare global {
  interface Window {
    plausible?: (tag: string, e?: object) => void;
  }
}

const WasmQueryOptimizer = {
  expandFilter: (f: ReqFilter) => {
    return expand_filter(f) as Array<FlatReqFilter>;
  },
  getDiff: (prev: Array<ReqFilter>, next: Array<ReqFilter>) => {
    return get_diff(prev, next) as Array<FlatReqFilter>;
  },
  flatMerge: (all: Array<FlatReqFilter>) => {
    return flat_merge(all) as Array<ReqFilter>;
  },
  compress: (all: Array<ReqFilter>) => {
    return compress(all) as Array<ReqFilter>;
  },
  schnorrVerify: (id, sig, pubkey) => {
    return schnorr_verify(id, sig, pubkey);
  },
} as QueryOptimizer;

export class WasmPowWorker implements PowMiner {
  minePow(ev: NostrEvent, target: number): Promise<NostrEvent> {
    const res = pow(ev, target);
    return Promise.resolve(res);
  }
}

const hasWasm = "WebAssembly" in globalThis;
const DefaultPowWorker = hasWasm ? undefined : new PowWorker(PowWorkerURL);
export const GetPowWorker = () => (hasWasm ? new WasmPowWorker() : unwrap(DefaultPowWorker));

/**
 * Singleton nostr system
 */
export const System = new NostrSystem({
  relayCache: UserRelays,
  profileCache: UserCache,
  relayMetrics: RelayMetrics,
  queryOptimizer: hasWasm ? WasmQueryOptimizer : undefined,
  db: SystemDb,
});

const worker = new IndexedDBWorker();
const indexedDB = Comlink.wrap(worker);
const systemHandleEvent = Comlink.proxy((e: TaggedNostrEvent) => {
  requestAnimationFrame(() => {
    System.HandleEvent(e);
  })
});
indexedDB.getProfilesAndContactLists(systemHandleEvent);

System.on("auth", async (c, r, cb) => {
  const { id } = LoginStore.snapshot();
  const pub = LoginStore.getPublisher(id);
  if (pub) {
    cb(await pub.nip42Auth(c, r));
  }
});


const seenEvents = new Set<string>();
System.on("event", ev => {
  // these should extend Actor class which schedules every handleEvent call with a setInterval queue
  // in order to not block the main thread?
  // maybe even handleMessage using nostr network messages, so Actors could even be workers?
  if (seenEvents.has(ev.id)) {
    return;
  }
  seenEvents.add(ev.id);
  InMemoryDB.handleEvent(ev);
  requestAnimationFrame(() => {
    // avoid blocking main thread
    addToFuzzySearch(ev);
    socialGraphInstance.handleEvent(ev);
    if (socialGraphInstance.getFollowDistance(ev.pubkey) <= 2) {
      indexedDB.handleEvent(ev);
    }
  });
});

System.on("request", req => {
  req.filters.forEach(filter => indexedDB.find(filter, systemHandleEvent));
});

async function fetchProfile(key: string) {
  try {
    throwIfOffline();
    const rsp = await fetch(`${CONFIG.httpCache}/profile/${key}`);
    if (rsp.ok) {
      const data = (await rsp.json()) as NostrEvent;
      if (data) {
        return mapEventToProfile(data);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Add profile loader fn
 */
if (CONFIG.httpCache) {
  System.ProfileLoader.loaderFn = async (keys: Array<string>) => {
    return removeUndefined(await Promise.all(keys.map(a => fetchProfile(a))));
  };
}

/**
 * Singleton user profile loader
 */
export const ProfileLoader = new ProfileLoaderService(System, UserCache);

serviceWorkerRegistration.register();

async function initSite() {
  console.debug(getCountry());
  storeRefCode();
  if (hasWasm) {
    await wasmInit(WasmPath);
  }
  const login = LoginStore.takeSnapshot();
  db.ready = await db.isAvailable();
  if (db.ready) {
    await preload(login.follows.item);
  }

  updateRelayConnections(System, login.relays.item).catch(console.error);

  try {
    if ("registerProtocolHandler" in window.navigator) {
      window.navigator.registerProtocolHandler("web+nostr", `${window.location.protocol}//${window.location.host}/%s`);
      console.info("Registered protocol handler for 'web+nostr'");
    }
  } catch (e) {
    console.error("Failed to register protocol handler", e);
  }

  // inject analytics script
  // <script defer data-domain="snort.social" src="http://analytics.v0l.io/js/script.js"></script>
  if (CONFIG.features.analytics && (login.appData.item.preferences.telemetry ?? true)) {
    const sc = document.createElement("script");
    sc.src = "https://analytics.v0l.io/js/script.js";
    sc.defer = true;
    sc.setAttribute("data-domain", CONFIG.hostname);
    document.head.appendChild(sc);
  }

  setupWebLNWalletConfig(Wallets);
  return null;
}

let didInit = false;
const mainRoutes = [
  ...RootRoutes,
  {
    path: "/help",
    element: <HelpPage />,
  },
  {
    path: "/e/:id",
    element: <ThreadRoute />,
  },
  {
    path: "/p/:id",
    element: <ProfilePage />,
  },
  {
    path: "/notifications",
    element: <NotificationsPage />,
  },
  {
    path: "/free-nostr-address",
    element: <FreeNostrAddressPage />,
  },
  {
    path: "/nostr-address",
    element: <NostrAddressPage />,
  },
  {
    path: "/messages/:id?",
    element: <MessagesPage />,
  },
  {
    path: "/donate",
    element: <DonatePage />,
  },
  {
    path: "/search/:keyword?",
    element: <SearchPage />,
  },
  {
    path: "/list-feed/:id",
    element: <ListFeedPage />,
  },
  {
    path: "/about",
    element: <AboutPage />,
  },
  {
    path: "/graph",
    element: <NetworkGraph />,
  },
  ...OnboardingRoutes,
  ...SettingsRoutes,
] as Array<RouteObject>;

if (CONFIG.features.zapPool) {
  mainRoutes.push({
    path: "/zap-pool",
    element: <ZapPoolPage />,
  });
}

if (CONFIG.features.subscriptions) {
  mainRoutes.push(...SubscribeRoutes);
}

// add catch all route
mainRoutes.push({
  path: "/:link",
  element: <NostrLinkHandler />,
});

const routes = [
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    loader: async () => {
      if (!didInit) {
        didInit = true;
        return await initSite();
      }
      return null;
    },
    children: mainRoutes,
  },
] as Array<RouteObject>;

if (CONFIG.features.deck) {
  routes.push({
    path: "/deck",
    element: <SnortDeckLayout />,
    loader: async () => {
      if (!didInit) {
        didInit = true;
        return await initSite();
      }
      return null;
    },
    children: RootTabRoutes,
  } as RouteObject);
}

export const router = createBrowserRouter(routes);

const root = ReactDOM.createRoot(unwrap(document.getElementById("root")));
root.render(
  <StrictMode>
    <IntlProvider>
      <SnortContext.Provider value={System}>
        <RouterProvider router={router} />
      </SnortContext.Provider>
    </IntlProvider>
  </StrictMode>,
);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
window.encodeTLV = encodeTLVEntries;

// Use react-helmet instead?
document.title = CONFIG.appTitle;
document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute("href", CONFIG.appleTouchIconUrl);
