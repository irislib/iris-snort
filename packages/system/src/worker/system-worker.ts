import { v4 as uuid } from "uuid";
import EventEmitter from "eventemitter3";
import {
  ConnectionStateSnapshot,
  NostrEvent,
  NoteStore,
  OkResponse,
  ProfileLoaderService,
  QueryOptimizer,
  RelayCache,
  RelaySettings,
  RequestBuilder,
  SystemInterface,
  TaggedNostrEvent,
} from "..";
import { NostrSystemEvents, NostrsystemProps } from "../nostr-system";
import { Query } from "../query";
import { NostrSystemCommand, NostrSystemMessage } from ".";

export class SystemWorker extends EventEmitter<NostrSystemEvents> implements SystemInterface {
  #worker: Worker;
  #commandQueue: Map<string, (v: unknown) => void> = new Map();
  checkSigs: boolean;

  constructor(scriptPath: string, props: NostrsystemProps) {
    super();
    this.checkSigs = props.checkSigs ?? false;

    this.#worker = new Worker(scriptPath, {
      name: "SystemWorker",
    });
  }

  get Sockets(): ConnectionStateSnapshot[] {
    throw new Error("Method not implemented.");
  }

  async Init() {
    await this.#workerRpc<void, string>(NostrSystemCommand.Init, undefined);
  }

  GetQuery(id: string): Query | undefined {
    return undefined;
  }

  Query<T extends NoteStore>(type: new () => T, req: RequestBuilder): Query {
    throw new Error("Method not implemented.");
  }

  Fetch(req: RequestBuilder, cb?: ((evs: TaggedNostrEvent[]) => void) | undefined): Promise<TaggedNostrEvent[]> {
    throw new Error("Method not implemented.");
  }

  ConnectToRelay(address: string, options: RelaySettings): Promise<void> {
    throw new Error("Method not implemented.");
  }

  DisconnectRelay(address: string): void {
    throw new Error("Method not implemented.");
  }

  HandleEvent(ev: TaggedNostrEvent): void {
    throw new Error("Method not implemented.");
  }

  BroadcastEvent(ev: NostrEvent, cb?: ((rsp: OkResponse) => void) | undefined): Promise<OkResponse[]> {
    throw new Error("Method not implemented.");
  }

  WriteOnceToRelay(relay: string, ev: NostrEvent): Promise<OkResponse> {
    throw new Error("Method not implemented.");
  }

  get ProfileLoader(): ProfileLoaderService {
    throw new Error("Method not implemented.");
  }

  get RelayCache(): RelayCache {
    throw new Error("Method not implemented.");
  }

  get QueryOptimizer(): QueryOptimizer {
    throw new Error("Method not implemented.");
  }

  #workerRpc<T, R>(type: NostrSystemCommand, data: T, timeout = 5_000) {
    const id = uuid();
    this.#worker.postMessage({
      id,
      type,
      data,
    } as NostrSystemMessage<T>);
    return new Promise<R>((resolve, reject) => {
      let t: ReturnType<typeof setTimeout>;
      this.#commandQueue.set(id, v => {
        clearTimeout(t);
        const cmdReply = v as NostrSystemMessage<R>;
        if (cmdReply.type === NostrSystemCommand.OkResponse) {
          resolve(cmdReply.data);
        } else {
          reject(cmdReply.data);
        }
      });
      t = setTimeout(() => {
        reject("timeout");
      }, timeout);
    });
  }
}
