import Dexie, { Table } from "dexie";
import { ID, TaggedNostrEvent, UID, ReqFilter as Filter } from "@snort/system";
import { System } from "@/index";

type Tag = {
  id: string;
  eventId: string;
  type: string;
  value: string;
};

const handleEvent = (event: TaggedNostrEvent) => {
  /*😆*/
  requestAnimationFrame(() => {
    System.HandleEvent(event, { skipVerify: true });
  });
};

class IndexedDB extends Dexie {
  events!: Table<TaggedNostrEvent>;
  tags!: Table<Tag>;
  private saveQueue: TaggedNostrEvent[] = [];
  private seenEvents = new Set<UID>();
  private seenFilters = new Set<string>();

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
        handleEvent(event);
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

    /*
    const eventTags =
      event.tags
        ?.filter((tag) => {
          if (tag[0] === 'd') {
            return true;
          }
          if (tag[0] === 'e') {
            return true;
          }
          // we're only interested in p tags where we are mentioned
          if (tag[0] === 'p' && Key.isMine(tag[1])) {
            return true;
          }
          return false;
        })
        .map((tag) => ({
          id: event.id.slice(0, 16) + '-' + tag[0].slice(0, 16) + '-' + tag[1].slice(0, 16),
          eventId: event.id,
          type: tag[0],
          value: tag[1],
        })) || [];
     */

    this.saveQueue.push(event);
  }

  async find(filter: Filter) {
    if (!filter) return;

    const stringifiedFilter = JSON.stringify(filter);
    if (this.seenFilters.has(stringifiedFilter)) return;
    this.seenFilters.add(stringifiedFilter);

    if (filter["#p"] && Array.isArray(filter["#p"])) {
      for (const eventId of filter["#p"]) {
        this.subscribedTags.add("p|" + eventId);
      }

      await this.subscribeToTags();
      return;
    }

    if (filter["#e"] && Array.isArray(filter["#e"])) {
      for (const eventId of filter["#e"]) {
        this.subscribedTags.add("e|" + eventId);
      }

      await this.subscribeToTags();
      return;
    }

    if (filter["#d"] && Array.isArray(filter["#d"])) {
      for (const eventId of filter["#d"]) {
        this.subscribedTags.add("d|" + eventId);
      }

      await this.subscribeToTags();
      return;
    }

    if (filter.ids?.length) {
      filter.ids.forEach(id => this.subscribedEventIds.add(id));
      await this.subscribeToEventIds();
      return;
    }

    if (filter.authors?.length) {
      filter.authors.forEach(author => this.subscribedAuthors.add(author));
      await this.subscribeToAuthors();
      return;
    }

    let query = db.events;
    if (filter.kinds) {
      query = query.where("kind").anyOf(filter.kinds);
    }
    if (filter.search) {
      query = query.filter((event: Event) => event.content?.includes(filter.search!));
    }
    if (filter.limit) {
      query = query.limit(filter.limit);
    }
    // TODO test that the sort is actually working
    await query.each(handleEvent);
  }
}

export default new IndexedDB();
