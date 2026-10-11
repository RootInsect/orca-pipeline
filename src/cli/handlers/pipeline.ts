import type { CommandHandler } from '../dispatch'
import { getOptionalStringFlag, getRepeatedStringFlag, getRequiredStringFlag } from '../flags'
import { RuntimeClientError } from '../runtime/types'
import { writeStdoutLine } from '../stdout-line'
import {
  cmdConfigSet,
  cmdConfigShow,
  cmdCreate,
  cmdInit,
  cmdList,
  cmdOnce,
  cmdRun,
  cmdStatus,
  cmdUnblock
} from '../pipeline/commands'

function ioFrom(ctx: { json: boolean }): {
  write: (text: string) => void
  writeError: (text: string) => void
  json: boolean
} {
  return {
    json: ctx.json,
    write: (text) => {
      writeStdoutLine(text.endsWith('\n') ? text.slice(0, -1) : text)
    },
    writeError: (text) => {
      process.stderr.write(text)
    }
  }
}

function parseIntervalMs(flags: Map<string, string | boolean>): number | undefined {
  const raw = getOptionalStringFlag(flags, 'interval-ms')
  if (!raw) {
    return undefined
  }
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 200) {
    throw new RuntimeClientError('invalid_argument', '--interval-ms must be a number >= 200')
  }
  return value
}

export const PIPELINE_HANDLERS: Record<string, CommandHandler> = {
  'pipeline init': async (ctx) => {
    await cmdInit(ioFrom(ctx))
  },
  'pipeline create': async (ctx) => {
    await cmdCreate(ioFrom(ctx), {
      title: getRequiredStringFlag(ctx.flags, 'title'),
      body: getOptionalStringFlag(ctx.flags, 'body'),
      repo: getOptionalStringFlag(ctx.flags, 'repo'),
      projectId: getOptionalStringFlag(ctx.flags, 'project-id'),
      typeHint: getOptionalStringFlag(ctx.flags, 'type'),
      domainTags: getRepeatedStringFlag(ctx.flags, 'domain-tag'),
      developAgent: getOptionalStringFlag(ctx.flags, 'develop-agent'),
      reviewAgent: getOptionalStringFlag(ctx.flags, 'review-agent')
    })
  },
  'pipeline list': async (ctx) => {
    await cmdList(ioFrom(ctx), getOptionalStringFlag(ctx.flags, 'status'))
  },
  'pipeline status': async (ctx) => {
    await cmdStatus(ioFrom(ctx), getOptionalStringFlag(ctx.flags, 'task'))
  },
  'pipeline once': async (ctx) => {
    await cmdOnce(ioFrom(ctx))
  },
  'pipeline run': async (ctx) => {
    await cmdRun(ioFrom(ctx), parseIntervalMs(ctx.flags))
  },
  'pipeline unblock': async (ctx) => {
    await cmdUnblock(
      ioFrom(ctx),
      getRequiredStringFlag(ctx.flags, 'task'),
      getOptionalStringFlag(ctx.flags, 'note')
    )
  },
  'pipeline config show': async (ctx) => {
    await cmdConfigShow(ioFrom(ctx))
  },
  'pipeline config set': async (ctx) => {
    await cmdConfigSet(
      ioFrom(ctx),
      getRequiredStringFlag(ctx.flags, 'key'),
      getRequiredStringFlag(ctx.flags, 'value')
    )
  }
}
