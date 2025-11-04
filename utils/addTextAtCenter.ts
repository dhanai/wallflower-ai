// utils/addTextAtCenter.ts

import type { TLShapeId } from 'tldraw'
import { createShapeId, toRichText } from 'tldraw'

const ARTBOARD_W = 800
const ARTBOARD_H = 1000

export function addTextAtCenter(opts: {
  editor: any | null
  frameId?: TLShapeId | null
  text?: string
}) {
  const { editor, frameId, text = 'Your text here' } = opts
  if (!editor) return

  // Focus canvas so immediate edit works
  editor.focus()
  editor.setCurrentTool('select')

  // Figure out parent & coordinates
  let parentId = editor.getCurrentPageId()
  let x: number
  let y: number

  if (frameId) {
    const frame = editor.getShape(frameId) as any
    if (!frame) return
    parentId = frameId
    // position inside the frame (child coordinates are relative to parent)
    const w = Math.min(600, frame.props.w - 40) // give a nice default width
    x = Math.max(20, (frame.props.w - w) / 2)
    y = Math.max(20, (frame.props.h - 64) / 2)

    const id = createShapeId()

    editor.createShapes([
      {
        id,
        type: 'text',
        parentId,
        x,
        y,
        props: {
          // Text content
          richText: toRichText(text),
          // Layout
          w,
          autoSize: false,
          // Styling
          font: 'sans',           // 'draw' | 'sans' | 'serif' | 'mono'
          size: 'xl',             // 's' | 'm' | 'l' | 'xl'
          textAlign: 'middle',    // 'start' | 'middle' | 'end'
          color: 'black',         // uses app theme palette
        },
      } as any,
    ])

    // Select and enter edit mode
    editor.setSelectedShapes([id])
    // Give the DOM a tick so caret appears reliably
    requestAnimationFrame(() => editor.setEditingShape(id))
    return id
  }

  // ---- No frame fallback: drop at viewport center in page space ----
  const vp = editor.getViewportPageBounds()
  const w = Math.min(600, ARTBOARD_W - 40)
  x = vp.x + vp.width / 2 - w / 2
  y = vp.y + vp.height / 2 - 32

  const id = createShapeId()
  editor.createShapes([
    {
      id,
      type: 'text',
      parentId,
      x,
      y,
      props: {
        richText: toRichText(text),
        w,
        autoSize: false,
        font: 'sans',
        size: 'xl',
        textAlign: 'middle',
        color: 'black',
      },
    } as any,
  ])

  editor.setSelectedShapes([id])
  requestAnimationFrame(() => editor.setEditingShape(id))
  return id
}

