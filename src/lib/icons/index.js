/**
 * Ícones Lucide SVG otimizados e leves para o GeoFlight-BR.
 * Evita o carregamento de 1500+ ícones do barrel durante o build do Vite.
 */
import Icon from './Icon.svelte';

export { default as Icon } from './Icon.svelte';

export const icons = {
  plane: [
    ['path', { d: 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z' }]
  ],
  moon: [
    ['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]
  ],
  sun: [
    ['circle', { cx: '12', cy: '12', r: '4' }],
    ['path', { d: 'M12 2v2' }],
    ['path', { d: 'M12 20v2' }],
    ['path', { d: 'm4.93 4.93 1.41 1.41' }],
    ['path', { d: 'm17.66 17.66 1.41 1.41' }],
    ['path', { d: 'M2 12h2' }],
    ['path', { d: 'M20 12h2' }],
    ['path', { d: 'm6.34 17.66-1.41 1.41' }],
    ['path', { d: 'm19.07 4.93-1.41 1.41' }]
  ],
  play: [
    ['polygon', { points: '6 3 20 12 6 21 6 3' }]
  ],
  pause: [
    ['rect', { x: '14', y: '4', width: '4', height: '16', rx: '1' }],
    ['rect', { x: '6', y: '4', width: '4', height: '16', rx: '1' }]
  ],
  chevronLeft: [
    ['path', { d: 'm15 18-6-6 6-6' }]
  ],
  chevronRight: [
    ['path', { d: 'm9 18 6-6-6-6' }]
  ],
  search: [
    ['circle', { cx: '11', cy: '11', r: '8' }],
    ['path', { d: 'm21 21-4.3-4.3' }]
  ],
  x: [
    ['path', { d: 'M18 6 6 18' }],
    ['path', { d: 'm6 6 12 12' }]
  ],
  mapPin: [
    ['path', { d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0' }],
    ['circle', { cx: '12', cy: '10', r: '3' }]
  ],
  activity: [
    ['path', { d: 'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.48 12H2' }]
  ],
  share2: [
    ['circle', { cx: '18', cy: '5', r: '3' }],
    ['circle', { cx: '6', cy: '12', r: '3' }],
    ['circle', { cx: '18', cy: '19', r: '3' }],
    ['line', { x1: '8.59', x2: '15.42', y1: '13.51', y2: '17.49' }],
    ['line', { x1: '15.41', x2: '8.59', y1: '6.51', y2: '10.49' }]
  ],
  rotateCcw: [
    ['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }],
    ['path', { d: 'M3 3v5h5' }]
  ],
  externalLink: [
    ['path', { d: 'M15 3h6v6' }],
    ['path', { d: 'M10 14 21 3' }],
    ['path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }]
  ],
  trendingUp: [
    ['polyline', { points: '22 7 13.5 15.5 8.5 10.5 2 17' }],
    ['polyline', { points: '16 7 22 7 22 13' }]
  ],
  trendingDown: [
    ['polyline', { points: '22 17 13.5 8.5 8.5 13.5 2 7' }],
    ['polyline', { points: '16 17 22 17 22 11' }]
  ],
  arrowUpRight: [
    ['path', { d: 'M7 7h10v10' }],
    ['path', { d: 'M7 17 17 7' }]
  ],
  arrowRight: [
    ['path', { d: 'M5 12h14' }],
    ['path', { d: 'm12 5 7 7-7 7' }]
  ],
  alertTriangle: [
    ['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' }],
    ['line', { x1: '12', x2: '12', y1: '9', y2: '13' }],
    ['line', { x1: '12', x2: '12.01', y1: '17', y2: '17' }]
  ],
  alertCircle: [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['line', { x1: '12', x2: '12', y1: '8', y2: '12' }],
    ['line', { x1: '12', x2: '12.01', y1: '16', y2: '16' }]
  ],
  route: [
    ['circle', { cx: '6', cy: '19', r: '3' }],
    ['path', { d: 'M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15' }],
    ['circle', { cx: '18', cy: '5', r: '3' }]
  ],
  cornerDownRight: [
    ['polyline', { points: '15 10 20 15 15 20' }],
    ['path', { d: 'M4 4v7a4 4 0 0 0 4 4h12' }]
  ],
  info: [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['path', { d: 'M12 16v-4' }],
    ['path', { d: 'M12 8h.01' }]
  ],
  database: [
    ['ellipse', { cx: '12', cy: '5', rx: '9', ry: '3' }],
    ['path', { d: 'M3 5V19A9 3 0 0 0 21 19V5' }],
    ['path', { d: 'M3 12A9 3 0 0 0 21 12' }]
  ],
  code: [
    ['polyline', { points: '16 18 22 12 16 6' }],
    ['polyline', { points: '8 6 2 12 8 18' }]
  ],
  loader2: [
    ['path', { d: 'M21 12a9 9 0 1 1-6.219-8.56' }]
  ],
  shieldAlert: [
    ['path', { d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' }],
    ['path', { d: 'M12 8v4' }],
    ['path', { d: 'M12 16h.01' }]
  ],
  zapOff: [
    ['polyline', { points: '12.41 6.75 13 2 10.57 4.92' }],
    ['polyline', { points: '18.57 12.91 21 10 15.66 10' }],
    ['polyline', { points: '8 8 3 14 12 14 11 22 16 16' }],
    ['line', { x1: '2', x2: '22', y1: '2', y2: '22' }]
  ],
  bookOpen: [
    ['path', { d: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z' }],
    ['path', { d: 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' }]
  ],
  sparkles: [
    ['path', { d: 'm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z' }]
  ],
  zap: [
    ['polygon', { points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' }]
  ]
};
