import loki from "lokijs";
import { ID, STR, TaggedNostrEvent, ReqFilter as Filter } from "@snort/system";
import Dexie, { Table } from "dexie";

type Tag = {
  id: string;
  eventId: string;
  type: string;
  value: string;
};

class MyDexie extends Dexie {
  events!: Table<TaggedNostrEvent>;
  tags!: Table<Tag>;

  constructor() {
    super("EventDB");

    this.version(5).stores({
      events: "id, pubkey, kind, created_at, [pubkey+kind]",
      tags: "id, eventId, [type+value]",
    });
  }
}

export class EventDB {
  private loki = new loki("EventDB");
  private idb = new MyDexie();
  private eventsCollection: any;

  constructor() {
    this.eventsCollection = this.loki.addCollection("events", {
      unique: ["id"],
      indices: ["pubkey", "kind", "flatTags", "created_at"],
    });
    this.idb.events.each(event => {
      this.insert(event, false);
    });
  }

  get(id: any): TaggedNostrEvent | undefined {
    const event = this.eventsCollection.by("id", ID(id)); // throw if db not ready yet?
    if (event) {
      return this.unpack(event);
    }
  }

  // map to internal UIDs to save memory
  private pack(event: TaggedNostrEvent) {
    const clone: any = { ...event };
    clone.tags = event.tags.map(tag => {
      if (["e", "p"].includes(tag[0])) {
        return [tag[0], ID(tag[1])];
      } else {
        return tag;
      }
    });
    clone.pubkey = ID(event.pubkey);
    clone.id = ID(event.id);
    return clone;
  }

  private unpack(packedEvent: any): TaggedNostrEvent {
    const original: any = { ...packedEvent };
    delete original.flatTags;
    delete original.$loki;
    delete original.meta;

    // Convert every ID back to original tag[1], tag[2], ...
    original.tags = packedEvent.tags.map(tag => {
      if (["e", "p"].includes(tag[0])) {
        return [tag[0], STR(tag[1])];
      } else {
        return tag;
      }
    });
    original.pubkey = STR(packedEvent.pubkey);
    original.id = STR(packedEvent.id);

    return original as TaggedNostrEvent;
  }

  insert(event: TaggedNostrEvent, saveToIdb = true): boolean {
    if (!event || !event.id || !event.created_at) {
      throw new Error("Invalid event");
    }

    if (this.eventsCollection.by("id", ID(event.id))) {
      return false; // this prevents updating event.relays?
    }

    const clone = this.pack(event);
    const flatTags = clone.tags.filter(tag => ["e", "p", "d"].includes(tag[0])).map(tag => tag.join("_"));

    try {
      this.eventsCollection.insert({ ...clone, flatTags });
    } catch (e) {
      return false;
    }

    if (saveToIdb) {
      this.idb.events.put(event); // TODO bulk
    }

    return true;
  }

  remove(eventId: string): void {
    const id = ID(eventId);
    this.eventsCollection.findAndRemove({ id });
    this.idb.events.where({ id }).delete();
  }

  find(filter: Filter, callback: (event: TaggedNostrEvent) => void): void {
    this.findArray(filter).forEach(event => {
      callback(event);
    });
  }

  findArray(filter: Filter): TaggedNostrEvent[] {
    const query: any = this.constructQuery(filter);

    let chain = this.eventsCollection
      .chain()
      .find(query)
      .where((e: TaggedNostrEvent) => {
        if (filter.search && !e.content?.includes(filter.search)) {
          return false;
        }
        return true;
      })
      .simplesort("created_at", true);

    if (filter.limit) {
      chain = chain.limit(filter.limit);
    }

    return chain.data().map(e => this.unpack(e));
  }

  findAndRemove(filter: Filter) {
    const query: any = this.constructQuery(filter);
    this.eventsCollection.findAndRemove(query);
  }

  private constructQuery(filter: Filter): any {
    const query: any = {};

    if (filter.ids) {
      query.id = { $in: filter.ids.map(ID) };
    } else {
      if (filter.authors) {
        query.pubkey = { $in: filter.authors.map(ID) };
      }
      if (filter.kinds) {
        query.kind = { $in: filter.kinds };
      }
      if (filter["#e"]) {
        query.flatTags = { $contains: "e_" + filter["#e"].map(ID) };
      } else if (filter["#p"]) {
        query.flatTags = { $contains: "p_" + filter["#p"].map(ID) };
      } else if (filter["#d"]) {
        query.flatTags = { $contains: "d_" + filter["#d"].map(ID) };
      }
      if (filter.since && filter.until) {
        query.created_at = { $between: [filter.since, filter.until] };
      }
      if (filter.since) {
        query.created_at = { $gte: filter.since };
      }
      if (filter.until) {
        query.created_at = { $lte: filter.until };
      }
    }

    return query;
  }

  findOne(filter: Filter): TaggedNostrEvent | undefined {
    return this.findArray(filter)[0];
  }
}

export default new EventDB();
