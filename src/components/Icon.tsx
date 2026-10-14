import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type IconName = 'home' | 'explore' | 'heart' | 'calendar' | 'user' | 'search' | 'filter' | 'pin' | 'back' | 'bell' | 'star' | 'wifi' | 'screen' | 'board' | 'projector' | 'coffee' | 'lock' | 'users' | 'arrow' | 'clock' | 'close' | 'check' | 'grid' | 'list' | 'info' | 'chevron' | 'plus' | 'minus' | 'ticket' | 'briefcase' | 'cowork' | 'share' | 'spark' | 'power' | 'snow';

type Props = { name: IconName; size?: number; color?: string; filled?: boolean; strokeWidth?: number };

export function Icon({ name, size = 22, color = '#512D37', filled = false, strokeWidth = 1.9 }: Props) {
  const common = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  let drawing: React.ReactNode;
  switch (name) {
    case 'home': drawing = <><Path d="M3 10.5 12 3l9 7.5V21H3z" {...common} /><Path d="M9 21v-7h6v7" {...common} /></>; break;
    case 'explore': drawing = <><Circle cx="12" cy="12" r="9" {...common} /><Path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" {...common} /></>; break;
    case 'heart': drawing = <Path d="M20.8 8.3c0 5.4-8.8 11.3-8.8 11.3S3.2 13.7 3.2 8.3a4.6 4.6 0 0 1 8.8-1.9 4.6 4.6 0 0 1 8.8 1.9Z" {...common} fill={filled ? color : 'none'} />; break;
    case 'calendar': drawing = <><Rect x="3" y="5" width="18" height="16" rx="2" {...common} /><Line x1="7" y1="3" x2="7" y2="7" {...common} /><Line x1="17" y1="3" x2="17" y2="7" {...common} /><Line x1="3" y1="10" x2="21" y2="10" {...common} /><Path d="m8 15 2.3 2.3L16 13" {...common} /></>; break;
    case 'user': drawing = <><Circle cx="12" cy="8" r="4" {...common} /><Path d="M4 21c.4-4.1 3.2-6 8-6s7.6 1.9 8 6" {...common} /></>; break;
    case 'search': drawing = <><Circle cx="10.5" cy="10.5" r="6.5" {...common} /><Line x1="16" y1="16" x2="21" y2="21" {...common} /></>; break;
    case 'filter': drawing = <><Line x1="4" y1="7" x2="20" y2="7" {...common} /><Line x1="4" y1="17" x2="20" y2="17" {...common} /><Circle cx="9" cy="7" r="2" fill="white" stroke={color} strokeWidth={strokeWidth} /><Circle cx="16" cy="17" r="2" fill="white" stroke={color} strokeWidth={strokeWidth} /></>; break;
    case 'pin': drawing = <><Path d="M12 22s-7-6.6-7-12a7 7 0 1 1 14 0c0 5.4-7 12-7 12Z" {...common} /><Circle cx="12" cy="10" r="2.5" {...common} /></>; break;
    case 'back': drawing = <Path d="m15 4-8 8 8 8" {...common} />; break;
    case 'bell': drawing = <><Path d="M5 17h14l-2-2V9a5 5 0 0 0-10 0v6z" {...common} /><Path d="M10 20a2 2 0 0 0 4 0" {...common} /></>; break;
    case 'star': drawing = <Path d="m12 2.8 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z" {...common} fill={filled ? color : 'none'} />; break;
    case 'wifi': drawing = <><Path d="M2 9a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8 15a6 6 0 0 1 8 0" {...common} /><Circle cx="12" cy="19" r="1" fill={color} /></>; break;
    case 'screen': drawing = <><Rect x="3" y="4" width="18" height="13" rx="2" {...common} /><Line x1="12" y1="17" x2="12" y2="21" {...common} /><Line x1="7" y1="21" x2="17" y2="21" {...common} /></>; break;
    case 'board': drawing = <><Rect x="3" y="3" width="18" height="14" rx="1" {...common} /><Line x1="12" y1="17" x2="12" y2="21" {...common} /><Path d="m7 21 5-4 5 4M7 9h9M7 12h6" {...common} /></>; break;
    case 'projector': drawing = <><Rect x="3" y="6" width="18" height="11" rx="2" {...common} /><Circle cx="15" cy="11.5" r="3" {...common} /><Line x1="7" y1="17" x2="6" y2="20" {...common} /><Line x1="17" y1="17" x2="18" y2="20" {...common} /></>; break;
    case 'coffee': drawing = <><Path d="M4 7h13v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 8h2a2 2 0 0 1 0 4h-2M8 3v2M13 3v2" {...common} /></>; break;
    case 'lock': drawing = <><Rect x="5" y="10" width="14" height="11" rx="2" {...common} /><Path d="M8 10V7a4 4 0 0 1 8 0v3" {...common} /><Circle cx="12" cy="15" r="1" fill={color} /></>; break;
    case 'users': drawing = <><Circle cx="8" cy="8" r="3" {...common} /><Circle cx="17" cy="8" r="3" {...common} /><Path d="M2 20v-3a5 5 0 0 1 10 0v3M12 20v-3a5 5 0 0 1 10 0v3" {...common} /></>; break;
    case 'arrow': drawing = <Path d="M4 12h16m-7-7 7 7-7 7" {...common} />; break;
    case 'clock': drawing = <><Circle cx="12" cy="12" r="9" {...common} /><Path d="M12 7v5l3 2" {...common} /></>; break;
    case 'close': drawing = <Path d="M5 5 19 19M19 5 5 19" {...common} />; break;
    case 'check': drawing = <Path d="m4 12 5 5L20 6" {...common} />; break;
    case 'grid': drawing = <><Rect x="3" y="3" width="7" height="7" rx="1" {...common} /><Rect x="14" y="3" width="7" height="7" rx="1" {...common} /><Rect x="3" y="14" width="7" height="7" rx="1" {...common} /><Rect x="14" y="14" width="7" height="7" rx="1" {...common} /></>; break;
    case 'list': drawing = <><Path d="M8 6h13M8 12h13M8 18h13" {...common} /><Circle cx="3" cy="6" r="1" fill={color} /><Circle cx="3" cy="12" r="1" fill={color} /><Circle cx="3" cy="18" r="1" fill={color} /></>; break;
    case 'info': drawing = <><Circle cx="12" cy="12" r="9" {...common} /><Path d="M12 11v6" {...common} /><Circle cx="12" cy="7" r="1" fill={color} /></>; break;
    case 'chevron': drawing = <Path d="m7 10 5 5 5-5" {...common} />; break;
    case 'plus': drawing = <Path d="M12 4v16M4 12h16" {...common} />; break;
    case 'minus': drawing = <Path d="M4 12h16" {...common} />; break;
    case 'ticket': drawing = <><Path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4z" {...common} /><Path d="M12 5v2M12 10v4M12 17v2" {...common} /></>; break;
    case 'briefcase': drawing = <><Rect x="3" y="7" width="18" height="13" rx="2" {...common} /><Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" {...common} /></>; break;
    case 'cowork': drawing = <><Circle cx="8" cy="6" r="2" {...common} /><Circle cx="17" cy="6" r="2" {...common} /><Path d="M3 13h18M6 13v8M18 13v8M6 10h4l2 3 2-3h4" {...common} /></>; break;
    case 'share': drawing = <><Circle cx="18" cy="5" r="2" {...common} /><Circle cx="6" cy="12" r="2" {...common} /><Circle cx="18" cy="19" r="2" {...common} /><Path d="m8 11 8-5M8 13l8 5" {...common} /></>; break;
    case 'spark': drawing = <Path d="M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" {...common} fill={filled ? color : 'none'} />; break;
    case 'power': drawing = <><Path d="M12 3v10M6 6a9 9 0 1 0 12 0" {...common} /></>; break;
    case 'snow': drawing = <><Path d="M12 2v20M4 6l16 12M20 6 4 18M9 4l3 3 3-3M9 20l3-3 3 3" {...common} /></>; break;
  }
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">{drawing}</Svg>;
}
