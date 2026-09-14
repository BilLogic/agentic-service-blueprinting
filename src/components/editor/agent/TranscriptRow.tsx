import { lazy, Suspense, useState } from 'react'
import { ChevronRight, Pencil } from 'lucide-react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Eyebrow } from '@/components/blueprint/Eyebrow'
import { Badge } from '@/components/ui/badge'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Marker,
  MarkerContent,
  MarkerIcon,
  markerVariants,
} from '@/components/ui/marker'
import { Message, MessageContent } from '@/components/ui/message'
import { type TranscriptEvent } from '@/lib/agent/loop'
import { cn } from '@/lib/utils'

/*
 * Lazy: AgentMarkdown is the only importer of react-markdown's unified
 * toolchain, and transcripts only render once the agent surface is open —
 * no reason for the landing page to pay for a markdown parser. The fallback
 * is the raw text, so a slow chunk shows content, not a spinner.
 */
const AgentMarkdownLazy = lazy(() =>
  import('@/components/editor/AgentMarkdown').then((m) => ({
    default: m.AgentMarkdown,
  })),
)

function AgentMarkdown(props: { text: string; className?: string }) {
  return (
    <Suspense
      fallback={
        <p className={cn('whitespace-pre-wrap', props.className)}>
          {props.text}
        </p>
      }
    >
      <AgentMarkdownLazy {...props} />
    </Suspense>
  )
}

/**
 * One transcript row, built from the DS chat primitives: user turns are
 * tinted bubbles on the right, agent prose is a ghost bubble, tool calls
 * and status lines are Markers — the chat vocabulary shadcn ships, not a
 * hand-rolled lookalike.
 */

type ToolEvent = Extract<TranscriptEvent, { kind: 'tool' }>

/** One labelled payload block inside an opened tool row. */
function ToolDetail({ label, body }: { label: string; body: string }) {
  return (
    <div className="min-w-0">
      <Eyebrow>
        {label}
      </Eyebrow>
      <pre className="mt-0.5 max-h-40 overflow-auto rounded-md bg-muted px-2 py-1.5 font-mono text-xs whitespace-pre-wrap text-foreground">
        {body}
      </pre>
    </div>
  )
}

/**
 * A tool call. Collapsed it is the same quiet one-liner it always was; open
 * it shows the arguments the agent sent and what came back — the same
 * disclosure vocabulary as the folded steps block, so a reviewer only has
 * to learn one gesture. Rows rehydrated from a previous browser session carry
 * no payload and stay flat.
 */
function ToolRow({ event }: { event: ToolEvent }) {
  const [open, setOpen] = useState(false)
  const expandable = Boolean(event.args || event.result)
  const face = (
    <>
      <MarkerIcon>
        {event.isError ? (
          <XCircle aria-hidden />
        ) : (
          <CheckCircle2 aria-hidden />
        )}
      </MarkerIcon>
      <MarkerContent className={cn(!open && 'truncate')}>
        <span className="font-mono">{event.name}</span>
        {event.summary ? (
          <span className="ml-1.5 text-muted-foreground">{event.summary}</span>
        ) : null}
      </MarkerContent>
    </>
  )

  if (!expandable) {
    return (
      <Marker className={cn(event.isError && 'text-destructive')}>
        {face}
      </Marker>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className={cn(
              markerVariants({ variant: 'default' }),
              'cursor-pointer rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              event.isError && 'text-destructive',
            )}
          >
            {face}
            <ChevronRight
              className={cn(
                'ml-auto size-3 shrink-0 opacity-60 transition-transform',
                open && 'rotate-90',
              )}
              aria-hidden
            />
          </button>
        }
      />
      <CollapsibleContent>
        <div className="mt-1 ml-6 flex flex-col gap-1.5">
          {event.args ? <ToolDetail label="Arguments" body={event.args} /> : null}
          {event.result ? (
            <ToolDetail label="Result" body={event.result} />
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function TranscriptRow({
  event,
}: {
  event: TranscriptEvent
}) {
  switch (event.kind) {
    case 'user':
      return (
        <Message align="end">
          <MessageContent>
            {event.skill || event.attachmentLabel ? (
              <div className="mb-0.5 flex justify-end gap-1">
                {event.skill ? (
                  <Badge variant="secondary" className="font-mono">
                    /{event.skill}
                  </Badge>
                ) : null}
                {event.attachmentLabel ? (
                  <Badge variant="outline">
                    <Pencil aria-hidden />
                    {event.attachmentLabel}
                  </Badge>
                ) : null}
              </div>
            ) : null}
            <Bubble variant="tinted">
              <BubbleContent className="whitespace-pre-wrap">
                {event.text}
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      )
    case 'assistant':
      return (
        <Message>
          <MessageContent>
            <Bubble variant="ghost">
              <BubbleContent className="text-foreground">
                <AgentMarkdown text={event.text} />
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      )
    case 'tool':
      return <ToolRow event={event} />
    case 'status':
      return (
        <Marker variant="separator" className="italic">
          <MarkerContent>{event.text}</MarkerContent>
        </Marker>
      )
  }
}
