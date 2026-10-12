// Explicit, reviewed question-to-guide assignments. Each row is a worksheet in
// its preserved question order (10 lines of 5 would be harder to compare with the
// original: the rows below use 5 lines of 10). No keyword guesses or catch-all.
const QUESTION_GUIDE_ROWS = {
  1: `
    tracks tracks hidden priority ban-special pedcross slash distance sign-crossings driver-marks
    road-manners signal-yellow warning-facility sign-indications closesigns aux-section weight-sign warning-road policeorder keepleft
    road-manners driver-marks driver-marks karimen emergency start-check child-seat oneway yield signs
    safety hidden railway speed brake-use stopping-factors timing2 horn lane-boundaries pedcross
    overtake-unsafe leftpass overtake-unsafe timing2 turnway zones at-basics at-basics atgear phone`,
  2: `
    slowplaces handsig sign-crossings licenses emergency license-work lanes jam2 moped-route closesigns
    signal-yellow signals sign-dedicated closesigns slash ban-special sign-crossings zones stoppos police
    sign-indications licenses vehicles buslane phone overtake-width emergency moped-route zones safety3
    pedcross protect railway distance brake-use slowplaces slowplaces timing handsig slash
    pedestrian-space hill overtake-sequence overtake-sequence horn jam2 yield at-stop overtake-unsafe at-basics`,
  3: `
    keepleft timing2 moped-route ban-special horn oneway closesigns license-work buslane licenses
    driver-responsibility pedsig signals aux-section sign-indications moped-signs left-turn-signs signs cycle-marks policeorder
    police lanes driver-marks license-work license-ordinary posture buslane lanes emergency buslane
    turnway tram3 pass stopping-factors speed-force slowplaces slowplaces timing2 pedestrian-space horn-signs
    overtake-unsafe safety overtake-sequence leftpass moped-route signals lane-change atgear overtake-places at-stop`,
  4: `
    keepleft pedcross aux-conditions buslane timing2 at-basics left-turn-signs ban-trucks timing warning-road
    road-manners signal-yellow arrowsig left-turn-signs ban-trucks aux-section zones stopline slash policeorder
    police driver-marks sign-dedicated license-duty vehicles door child-seat aux-conditions keepleft emergency
    signs keepleft jam2 pedestrian-space protect road-manners slowplaces stopping-factors slowplaces timing
    hidden lanes right-turn-blind overtake-sign start-check meeting naurinsa yield at-basics atgear`,
  5: `
    licenses tram3 keepleft sign-crossings tram3 pedcross timing2 licenses pedsig arrowsig
    sign-indications signal-yellow warning-road signs sign-dedicated slash left-exceptions police road-manners emergency
    license-work start-check child-seat phone turnway emergency buslane zones tram3 naurinsa
    protect ready-check stopping-factors speed-2026 cycle-gap timing2 handsig horn protect slash
    overtake-sequence handsig oneway direction-signs yield pass at-basics atgear at-basics licenses`,
  6: `
    seatbelt warning-facility emergency zones timing left-turn-signs hidden ban-special moped-signs wakaba
    signal-yellow arrowsig left-turn-signs warning-traffic direction-signs ban-light sign-crossings warning-road noentry drink
    license-duty driver-marks license-ordinary zones posture child-seat phone keepleft turnway keepleft
    sign-dedicated pedestrian-space pedcross speed-2026 keepleft overtake-sequence stop60 brake-use safety horn
    lane-change hill overtake-sequence overtake-unsafe sided-lines naurinsa yield turnway overtake-sequence atgear`,
  7: `
    warning-road licenses safety priority turnway brake-use tracks sign-dedicated overtake-places overtake-sequence
    driver-responsibility arrowsig slash warning-traffic moped-signs sign-dedicated sign-dedicated curb-lines policeorder aux-conditions
    driver-marks driver-marks license-duty emergency left-exceptions emergency road-marks noentry pedestrian-space pedcross
    protect speed distance slowplaces slowplaces pedcross horn lane-change road-marks timing
    overtake-sequence overtake-sequence overtake-places jam2 signals moped-route posture overtake-sign at-basics atgear`,
  8: `
    license-duty oneway arrowsig tracks buslane yield ban-light bus-depart license-work turnway
    stoppos warning-traffic sign-indications horn-signs slash road-marks cycle-marks stoppos keepleft ready-check
    license-duty licenses emergency left-exceptions emergency keepleft pedestrian-space tram3 pedcross pass
    driver-marks distance brake-use protect timing2 protect horn lane-change keepleft timing2
    overtake-unsafe overtake-unsafe leftpass oneway signals yield at-stop atgear meeting at-basics`,
  9: `
    wakaba lanes sign-dedicated tram3 tram3 buslane moped-route sign-dedicated emergency tracks
    signal-yellow arrowsig signal-yellow warning-facility buslane sign-crossings noentry policeorder license-duty lanes
    license-duty licenses ready-check child-seat buslane emergency buslane zones railsig hidden
    fb30 keepleft signs slowplaces brake-use timing lane-change lane-boundaries slash overtake-unsafe
    sided-lines timing overtake-sequence overtake-unsafe meeting zones yield-tram at-basics atgear karimen`,
  10: `
    overtake-width slash lanes tram3 direction-signs keepleft hidden brake-use at-basics sign-dedicated
    road-manners arrowsig sign-crossings warning-road road-marks ban-light aux-conditions left-turn-signs direction-signs ready-check
    driver-marks left-exceptions licenses start-check phone buslane emergency road-edge road-edge tram3
    protect pedestrian-space signs distance priority handsig-left timing2 timing slash overtake-sequence
    leftpass horn-signs overtake-places turnway zones signals at-basics atgear at-stop license-ordinary`,
};
const QUESTION_GUIDES = Object.create(null);
const NOTE_QUESTION_IDS = new Map(NOTES.map(n => [n.id, []]));
(() => {
  const preferred = {
    roundabout:'n-round-new', karimen:'n-kari', vehicles:'n-veh',
    'start-check':'n-start-new', 'aux-section':'n-aux-new',
    centerline:'n-lines', railsig:'n-rail', stopline:'n-stop-position',
  };
  for (const worksheet of WORKSHEETS) {
    const keys = QUESTION_GUIDE_ROWS[worksheet.worksheet]?.trim().split(/\s+/);
    if (!keys || keys.length !== worksheet.orderedIds.length) throw new Error('Incomplete guide row: ' + worksheet.worksheet);
    worksheet.orderedIds.forEach((id, index) => {
      const figure = keys[index];
      if (!FIG[figure]) throw new Error('Missing guide figure for question ' + id + ': ' + figure);
      const notes = NOTES.filter(n => n.figs.includes(figure));
      if (!notes.length) throw new Error('Unlisted guide for question ' + id + ': ' + figure);
      const primary = preferred[figure] || notes.find(n => n.figs[0] === figure)?.id || notes[0].id;
      const noteIds = [primary, ...notes.map(n => n.id).filter(n => n !== primary)];
      QUESTION_GUIDES[id] = Object.freeze({figure, noteIds:Object.freeze(noteIds)});
      noteIds.forEach(noteId => NOTE_QUESTION_IDS.get(noteId).push(id));
    });
  }
  Object.freeze(QUESTION_GUIDES);
})();
