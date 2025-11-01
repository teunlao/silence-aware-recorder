import { EventBus } from './event-bus';
import type { CoreError, Frame, MeterPayload, Segment, VADScore } from './types';

export interface PipelineEvents extends Record<string, unknown> {
  vad: VADScore;
  speechStart: { tsMs: number };
  speechEnd: { tsMs: number };
  segment: Segment;
  meter: MeterPayload;
  error: CoreError;
}

export interface PipelineDependencies {
  now(): number;
  createId(): string;
}

export interface StageContext {
  emit<K extends keyof PipelineEvents>(event: K, payload: PipelineEvents[K]): void;
  on<K extends keyof PipelineEvents>(event: K, handler: (payload: PipelineEvents[K]) => void): () => void;
  now(): number;
  createId(): string;
}

export interface Stage {
  readonly name?: string;
  setup(context: StageContext): void;
  handle(frame: Frame): void;
  flush?(): void;
  teardown?(): void;
}

export class Pipeline {
  readonly events: EventBus<PipelineEvents>;

  private stages: Stage[] = [];

  private ready = false;

  private buffer: Frame[] = [];

  private maxBuffer = 64;

  private readonly now: () => number;

  private readonly createId: () => string;

  constructor(deps: PipelineDependencies) {
    this.now = deps.now;
    this.createId = deps.createId;
    this.events = new EventBus<PipelineEvents>();
  }

  use(stage: Stage): this {
    const context: StageContext = {
      emit: (event, payload) => {
        this.events.emit(event, payload);
      },
      on: (event, handler) => this.events.on(event, handler),
      now: () => this.now(),
      createId: () => this.createId(),
    };
    stage.setup(context);
    this.stages.push(stage);
    this.ready = this.stages.length > 0;
    return this;
  }

  clear(): void {
    for (let i = 0; i < this.stages.length; i += 1) {
      const stage = this.stages[i];
      stage.teardown?.();
    }
    this.stages = [];
    this.ready = false;
  }

  configure({ stages }: { stages: Stage[] }): void {
    // Replace stages atomically
    this.clear();
    for (const stage of stages) this.use(stage);
    this.reinitialize();
    // Flush buffered frames if any
    if (this.buffer.length > 0 && this.ready) {
      const frames = this.buffer;
      this.buffer = [];
      for (const f of frames) this.push(f);
    }
  }

  reinitialize(): void {
    for (let i = 0; i < this.stages.length; i += 1) {
      const stage = this.stages[i];
      const context: StageContext = {
        emit: (event, payload) => {
          this.events.emit(event, payload);
        },
        on: (event, handler) => this.events.on(event, handler),
        now: () => this.now(),
        createId: () => this.createId(),
      };
      stage.setup(context);
    }
  }

  push(frame: Frame): void {
    if (!this.ready) {
      if (this.buffer.length < this.maxBuffer) this.buffer.push(frame);
      return;
    }
    this.stages.forEach((stage) => {
      stage.handle(frame);
    });
  }

  flush(): void {
    this.stages.forEach((stage) => {
      stage.flush?.();
    });
  }

  dispose(): void {
    for (let i = 0; i < this.stages.length; i += 1) {
      const stage = this.stages[i];
      if (stage.teardown) {
        stage.teardown();
      }
    }
  }
}
