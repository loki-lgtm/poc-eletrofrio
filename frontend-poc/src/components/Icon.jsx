/* Eletrofrio — line icon set. <Icon name="..." size={18} /> */
const ICON_PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  activity: '<path d="M3 12h4l2.5-7 4 14 2.5-7H21"/>',
  bell: '<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v5"/><circle cx="12" cy="18" r=".6" fill="currentColor"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
  barchart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  linechart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  building: '<rect x="4" y="3" width="11" height="18" rx="1"/><path d="M15 9h4a1 1 0 0 1 1 1v11h-5"/><path d="M8 7h3M8 11h3M8 15h3"/>',
  wrench: '<path d="M14.5 5.5a3.5 3.5 0 0 0-4.7 4.2L4 15.5 8.5 20l5.8-5.8a3.5 3.5 0 0 0 4.2-4.7l-2.3 2.3-2.3-.6-.6-2.3 2.2-2.4Z"/>',
  shield: '<path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 7"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7L12.5 17"/>',
  flow: '<path d="M4 8h11m0 0-3-3m3 3-3 3"/><path d="M20 16H9m0 0 3-3m-3 3 3 3"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><circle cx="7" cy="7.5" r=".7" fill="currentColor"/><circle cx="7" cy="16.5" r=".7" fill="currentColor"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 21h16"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4-2v-4Z"/>',
  chevR: '<path d="m9 6 6 6-6 6"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v4h-4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  check: '<path d="m5 12 5 5 9-11"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
  snow: '<path d="M12 2v20M4 7l16 10M20 7 4 17"/><path d="m9 4 3 2 3-2M9 20l3-2 3 2M3 10l2 2-2 2M21 10l-2 2 2 2"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.2A3.2 3.2 0 0 1 16 11M21 20c0-2.6-1.3-4.4-3.5-5.1"/>',
  sparkles: '<path d="M12 3l1.8 4.7L18.5 9 13.8 10.8 12 15.5l-1.8-4.7L5.5 9l4.7-1.3Z"/><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z"/>',
  arrowUp: '<path d="M12 19V5m0 0-6 6m6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14m0 0 6-6m-6 6-6-6"/>',
  more: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="13" cy="18" r="2"/>',
  thermo: '<path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0Z"/><circle cx="12" cy="17" r="1.4" fill="currentColor"/>',
  gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 14 4-4"/><circle cx="12" cy="18" r="1" fill="currentColor"/>',
  dollar: '<path d="M12 2v20M16 6.5C16 4.6 14.2 3.5 12 3.5S8 4.6 8 6.5 9.8 9 12 9.5s4 1 4 3-1.8 3-4 3-4-1.1-4-3"/>',
  map: '<path d="m9 4 6 2 6-2v14l-6 2-6-2-6 2V6Z"/><path d="M9 4v14M15 6v14"/>',
  inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M3 13 6 5h12l3 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  play: '<path d="M7 5v14l11-7Z"/>',
  dot: '<circle cx="12" cy="12" r="3" fill="currentColor"/>',
};

export function Icon({ name, size = 18, style, className, strokeWidth = 1.7 }) {
  const d = ICON_PATHS[name] || ICON_PATHS.dot;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}
