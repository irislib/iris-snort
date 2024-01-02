import Dexie, { Table } from "dexie";
import { ID, TaggedNostrEvent, UID } from "@snort/system";
import { System } from "@/index";

type Tag = {
  id: string;
  eventId: string;
  type: string;
  value: string;
};

class IndexedDB extends Dexie {
  events!: Table<TaggedNostrEvent>;
  tags!: Table<Tag>;
  private saveQueue: TaggedNostrEvent[] = [];
  private seenEvents = new Set<UID>();

  constructor() {
    super("EventDB");

    this.version(5).stores({
      events: "id, pubkey, kind, created_at, [pubkey+kind]",
      tags: "id, eventId, [type+value]",
    });

    this.events
      .where("kind")
      .anyOf([0, 3]) // load social graph and profiles. TODO: load other stuff on request
      .each(event => {
        this.seenEvents.add(ID(event.id));
        // TODO: system should get these via subscribe method
        System.HandleEvent(event, { skipVerify: true });
      });

    this.startInterval();
  }

  private startInterval() {
    setInterval(() => {
      if (this.saveQueue.length > 0) {
        try {
          this.events.bulkPut(this.saveQueue);
        } catch (e) {
          console.error(e);
        } finally {
          this.saveQueue = [];
        }
      }
    }, 1000);
  }

  handleEvent(event: TaggedNostrEvent) {
    const id = ID(event.id);
    if (this.seenEvents.has(id)) {
      return;
    }
    this.seenEvents.add(id);
    this.saveQueue.push(event);
  }
}

export default new IndexedDB();