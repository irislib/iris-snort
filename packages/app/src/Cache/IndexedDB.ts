import Dexie, { Table } from "dexie";
import { ID, TaggedNostrEvent, UID, ReqFilter as Filter } from "@snort/system";
import { System } from "@/index";

type Tag = {
  id: string;
  eventId: string;
  type: string;
  value: string;
};

const systemHandleEvent = (event: TaggedNostrEvent) => {
  // requestAnimationFrame 😆
  requestAnimationFrame(() => {
    //console.log("found idb event", event.id, event.content?.slice(0, 20) || "");
    System.HandleEvent(event, { skipVerify: true });
  });
};

type SaveQueueEntry = { event: TaggedNostrEvent, tags: Tag[] };

class IndexedDB extends Dexie {
  events!: Table<TaggedNostrEvent>;
  tags!: Table<Tag>;
  private saveQueue: SaveQueueEntry[] = [];
  private seenEvents = new Set<UID>();
  private seenFilters = new Set<string>();
  private subscribedEventIds = new Set<string>();
  private subscribedAuthors = new Set<string>();
  private subscribedTags = new Set<string>();

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
        systemHandleEvent(event);
      });

    this.startInterval();
  }

  private startInterval() {
    setInterval(() => {
      if (this.saveQueue.length > 0) {
        try {
          const eventsToSave: TaggedNostrEvent[] = [];
          const tagsToSave: Tag[] = [];
          for (const item of this.saveQueue) {
            eventsToSave.push(item.event);
            tagsToSave.push(...item.tags);
          }
          this.events.bulkPut(eventsToSave);
          this.tags.bulkPut(tagsToSave);
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

    // maybe we don't want event.kind 3 tags
    const tags = event.kind === 3 ? [] :
      event.tags
        ?.filter((tag) => {
          if (tag[0] === 'd') {
            return true;
          }
          if (tag[0] === 'e') {
            return true;
          }
          // we're only interested in p tags where we are mentioned
          if (tag[0] === 'p') { // && Key.isMine(tag[1])) {
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

    this.saveQueue.push({event, tags});
  }

  _throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
          func.apply(this, args);
        }, limit);
      }
    };
  }

  subscribeToAuthors = this._throttle(async function (limit?: number) {
    const authors = [...this.subscribedAuthors];
    this.subscribedAuthors.clear();
    await this.events
      .where("pubkey")
      .anyOf(authors)
      .limit(limit || 1000)
      .each(systemHandleEvent);
  }, 1000);

  subscribeToEventIds = this._throttle(async function () {
    const ids = [...this.subscribedEventIds];
    this.subscribedEventIds.clear();
    await this.events.where("id").anyOf(ids).each(systemHandleEvent);
  }, 1000);

  subscribeToTags = this._throttle(async function() {
    const tagPairs = [...this.subscribedTags].map(tag => tag.split("|"));
    this.subscribedTags.clear();
    await this.tags
      .where("[type+value]")
      .anyOf(tagPairs)
      .each(tag => this.subscribedEventIds.add(tag.eventId));

    await this.subscribeToEventIds();
  }, 1000);

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

    let query = this.events;
    if (filter.kinds) {
      query = query.where("kind").anyOf(filter.kinds);
    }
    if (filter.search) {
      const regexp = new RegExp(filter.search, "i");
      query = query.filter((event: Event) => event.content?.match(regexp));
    }
    if (filter.limit) {
      query = query.limit(filter.limit);
    }
    // TODO test that the sort is actually working
    await query.each(e => {
      const id = ID(e.id);
      if (this.seenEvents.has(id)) {
        return; // this shouldn't be done unless retrieved stuff is stored in memory?
      }
      this.seenEvents.add(id);
      systemHandleEvent(e);
    });
  }
}

export default new IndexedDB();
