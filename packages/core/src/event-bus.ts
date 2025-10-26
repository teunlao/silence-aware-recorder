type EventHandler<Payload> = (payload: Payload) => void;

type HandlerMap<EventMap extends Record<string, unknown>> = {
  [K in keyof EventMap]?: Set<EventHandler<EventMap[K]>>;
};

export class EventBus<EventMap extends Record<string, unknown>> {
  private readonly handlers: HandlerMap<EventMap> = {};

  on<K extends keyof EventMap>(name: K, handler: EventHandler<EventMap[K]>): () => void {
    const set = this.handlers[name] ?? new Set<EventHandler<EventMap[K]>>();
    this.handlers[name] = set;
    set.add(handler);
    return () => set.delete(handler);
  }

  emit<K extends keyof EventMap>(name: K, payload: EventMap[K]): void {
    const set = this.handlers[name];
    if (!set) return;
    set.forEach((handler) => {
      handler(payload);
    });
  }
}
