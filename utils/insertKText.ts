// utils/insertKText.ts
import { createShapeId, TLShapeId } from 'tldraw';
import { KTextShape } from '@/shapes/KText';

type KTextProps = {
  text: string;
  sizePx: number;
  fontFamily: string;
  fontWeight: number;
  fill: string;
  align: 'start' | 'middle' | 'end';
  curved: boolean;
  parentId?: TLShapeId;
};

export function insertKText(editor: any, props: KTextProps): TLShapeId {
  // Derive a rough width/height to help center the box
  const approxWidth = Math.max(280, Math.min(700, props.text.length * (props.sizePx * 0.6)));
  const approxHeight = props.sizePx * 1.2;

  const id = createShapeId();

  let x = 0, y = 0, parentId = props.parentId;

  if (parentId) {
    const frame = editor.getShape(parentId) as any;
    if (frame) {
      // Local coordinates inside the frame
      x = Math.round((frame.props.w - approxWidth) / 2);
      y = Math.round((frame.props.h - approxHeight) / 2);
    }
  } else {
    // No parent: place in page space at viewport center
    const vp = editor.getViewportPageBounds();
    x = Math.round(vp.x + vp.width / 2 - approxWidth / 2);
    y = Math.round(vp.y + vp.height / 2 - approxHeight / 2);
  }

  editor.createShapes([{
    id,
    type: 'ktext',
    parentId,
    x,
    y,
    rotation: 0,
    props: {
      text: props.text,
      sizePx: props.sizePx,
      fontFamily: props.fontFamily,
      fontWeight: props.fontWeight,
      fill: props.fill,
      align: props.align,
      curved: props.curved,
      letterSpacing: 0,
      lineHeight: 1.2,
      radius: 250,
      arc: 180,
      upsideDown: false,
      transformType: 'none' as const,
      archCurve: 0,
      stroke: '#000000',
      strokeWidth: 0,
      gradient: undefined,
      shadow: undefined,
      extrude: undefined,
      w: approxWidth,
    },
  }]);

  return id;
}

