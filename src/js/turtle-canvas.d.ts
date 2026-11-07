/**
 * Type definitions for Turtle Scroll Canvas & Arrow Engine
 */

export interface Point {
  x: number | string;
  y: number | string;
}

export interface ArrowOptions {
  show?: boolean;
  size?: number;
  color?: string;
  style?: 'solid' | 'sketch' | 'hatched';
  hideAtEnd?: boolean;
}

export interface CurveTextOptions {
  content?: string;
  text?: string;
  offset?: number | string;
  align?: 'start' | 'center' | 'end';
  baselineOffset?: number;
  side?: 'above' | 'below' | 'on';
  font?: string;
  color?: string;
  letterSpacing?: number;
  reverse?: boolean | 'auto';
  autoReverse?: boolean;
  direction?: 'ltr' | 'rtl' | 'auto';
  followProgress?: boolean;
  autoRotate?: boolean;
  flipUpsideDown?: boolean;
  rotate?: number;
  opacity?: number;
  show?: boolean;
}

export interface TimelineOptions {
  duration?: number;
  delay?: number;
  reverse?: boolean | 'alternate' | 'pingpong';
  loop?: boolean | number;
  ease?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'cubicIn' | 'cubicOut' | 'cubicInOut' | ((t: number) => number);
  easing?: string;
  id?: string;
}

export interface BaseCurveOptions {
  progress?: number;
  startProgress?: number;
  trimStart?: number;
  tailProgress?: number;
  removeOnScroll?: boolean | [number | string, number | string] | number | { start?: number | string; end?: number | string };
  duration?: number;
  delay?: number;
  reverse?: boolean | 'alternate' | 'pingpong';
  loop?: boolean | number;
  ease?: string | ((t: number) => number);
  easing?: string;
  id?: string;
  strokeWidth?: number;
  width?: number;
  strokeColor?: string;
  color?: string;
  dash?: number[];
  moveWithScroll?: boolean;
  scrollWithPage?: boolean;
  fixed?: boolean;
  smooth?: boolean;
  lerp?: boolean;
  arrow?: boolean | ArrowOptions;
  text?: string | CurveTextOptions | (string | CurveTextOptions)[];
  stroke?: boolean;
  debug?: boolean;
}

export interface QuadraticCurveOptions extends BaseCurveOptions {
  start: Point;
  control: Point;
  end: Point;
}

export interface CubicCurveOptions extends BaseCurveOptions {
  start: Point;
  cp1: Point;
  cp2: Point;
  end: Point;
}

export interface SplineCurveOptions extends BaseCurveOptions {
  points: Point[];
}

export type CurveOptions =
  | QuadraticCurveOptions
  | CubicCurveOptions
  | SplineCurveOptions
  | (BaseCurveOptions & { curve?: Record<string, any> });

export interface AnimateState {
  time: number;
  timeMs: number;
  getTimeline: (options?: TimelineOptions) => number;
  scrollY: number;
  rawScroll: number;
  targetScroll: number;
  width: number;
  height: number;
  docHeight: number;
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  getProgress: (startTrigger: number | string, endTrigger: number | string) => number;
  getElementY: (selector: string, align?: 'top' | 'center' | 'middle' | 'bottom' | number) => number;
  pointAt: (selector: string, xRatio?: number, yRatio?: number) => { x: number; y: number };
  drawCurve: (options: CurveOptions) => void;
  drawQuadratic: (options: QuadraticCurveOptions) => void;
  drawCubic: (options: CubicCurveOptions) => void;
  drawSpline: (options: SplineCurveOptions) => void;
  drawTextOnCurve: (options: CurveOptions & { text: string | CurveTextOptions | (string | CurveTextOptions)[] }) => void;
  drawArrow: (x: number, y: number, angle: number, options?: ArrowOptions) => void;
  lerp: (a: number, b: number, t: number) => number;
  clamp: (val: number, min: number, max: number) => number;
  withScroll: (moveWithScroll: boolean, fn: (ctx: CanvasRenderingContext2D) => void) => void;
}

export interface TurtleEngineAPI {
  start: () => void;
  destroy: () => void;
  refresh: () => void;
  setEase: (ease: number) => void;
  setDebug: (enabled: boolean) => void;
  toggleDebug: () => boolean;
  drawTextOnCurve: (options: CurveOptions & { text: string | CurveTextOptions | (string | CurveTextOptions)[] }) => void;
  math: {
    clamp: (val: number, min: number, max: number) => number;
    lerp: (a: number, b: number, t: number) => number;
    evalCubicBezier: (p0: Point, p1: Point, p2: Point, p3: Point, t: number) => { x: number; y: number };
    catmullRomToCubicSegments: (pts: Point[]) => any[];
    samplePathAtDistance: (rawPoints: Point[], cumulativeDist: number[], targetDist: number) => { x: number; y: number; angle: number };
    getProgress: (start: number | string, end: number | string) => number;
    resolveScroll: (trigger: number | string) => number;
    resolveValue: (val: number | string, basis: number) => number;
  };
}

declare global {
  interface Window {
    TurtleEngine?: TurtleEngineAPI;
    ArrowAnimation?: {
      init?: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void;
      animate?: (state: AnimateState) => void;
    };
    init?: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void;
    animate?: (state: AnimateState) => void;
  }
}

