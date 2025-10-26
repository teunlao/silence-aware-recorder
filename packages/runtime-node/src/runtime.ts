import { createSegmenterStage, Pipeline, type SegmenterOptions, type Stage } from '@saraudio/core';
import { createRuntimeServices } from './context/services';
import { createPcm16FileSource } from './sources/pcm16-file-source';
import { createPcm16StreamSource } from './sources/pcm16-stream-source';
import type {
  NodePipelineOptions,
  NodeRuntime,
  Pcm16FileSourceOptions,
  Pcm16StreamSourceOptions,
  RunOptions,
  RuntimeOptions,
  SegmenterFactoryOptions,
} from './types';

const isStage = (value: SegmenterFactoryOptions | Stage): value is Stage =>
  typeof (value as Stage).setup === 'function' && typeof (value as Stage).handle === 'function';

const toSegmenterStage = (value: SegmenterFactoryOptions | Stage | undefined): Stage => {
  if (!value) {
    return createSegmenterStage();
  }
  if (isStage(value)) {
    return value;
  }
  const options: SegmenterOptions = {
    preRollMs: value.preRollMs,
    hangoverMs: value.hangoverMs,
  };
  return createSegmenterStage(options);
};

export const createNodeRuntime = (options?: RuntimeOptions): NodeRuntime => {
  const services = createRuntimeServices(options);

  const createPipeline = (options?: NodePipelineOptions): Pipeline => {
    const pipeline = new Pipeline({
      now: () => services.clock(),
      createId: () => services.createId(),
    });

    const stages = options?.stages ?? [];
    stages.forEach((stage) => {
      pipeline.use(stage);
    });

    if (options?.segmenter !== false) {
      const segmenterStage = toSegmenterStage(options?.segmenter as SegmenterFactoryOptions | Stage | undefined);
      pipeline.use(segmenterStage);
    }

    return pipeline;
  };

  const createSegmenter = (options?: SegmenterFactoryOptions): Stage => toSegmenterStage(options);

  const createStreamSource = (sourceOptions: Pcm16StreamSourceOptions) => createPcm16StreamSource(sourceOptions);

  const createFileSource = (sourceOptions: Pcm16FileSourceOptions) => createPcm16FileSource(sourceOptions);

  const run = async ({ source, pipeline, autoFlush = true }: RunOptions): Promise<void> => {
    try {
      await source.start((frame) => {
        pipeline.push(frame);
      });
      if (autoFlush) {
        pipeline.flush();
      }
    } finally {
      await source.stop();
    }
  };

  return {
    services,
    createPipeline,
    createSegmenter,
    createPcm16StreamSource: createStreamSource,
    createPcm16FileSource: createFileSource,
    run,
  };
};
