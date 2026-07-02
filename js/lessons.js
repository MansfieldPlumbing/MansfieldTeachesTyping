/* Lesson data — ported verbatim from the repo's pedagogical blueprint.
   Phases climb: home row -> reaches -> words -> sentences. Plumbing all the way down. */

export const LESSON_CATEGORIES = [
  {
    id: 'home_row_pumping',
    name: 'Phase 1 · Home Row Pumping',
    subtitle: 'One finger-pair at a time — just like the 1992 original',
    lessons: [
      { id: 'smash_home_1', title: 'Index Anchors · F J', focus: 'The two bump keys', type: 'letters', minWpm: 5,
        patterns: ['fff jjj fff jjj', 'fj fj fjf jfj fj fj', 'ffj jjf fjfj jfjf fffjjj'] },
      { id: 'smash_home_2', title: 'Middle Fingers · D K', focus: 'Add D and K', type: 'letters', minWpm: 5,
        patterns: ['ddd kkk ddd kkk', 'dk dk dkd kdk dk dk', 'fdk jkd ddk kkd dkdk fjdk'] },
      { id: 'smash_home_3', title: 'Ring Fingers · S L', focus: 'Add S and L', type: 'letters', minWpm: 6,
        patterns: ['sss lll sss lll', 'sl sl sls lsl sl sl', 'asl lls ssl slsl fdsl jkls'] },
      { id: 'smash_home_4', title: 'Pinky Reach · A ;', focus: 'Add A and semicolon', type: 'letters', minWpm: 6,
        patterns: ['aaa ;;; aaa ;;;', 'a; a; a;a ;a; a; a;', 'aa; ;;a a;a; asdf jkl;'] },
      { id: 'smash_home_5', title: 'The Whole Home Row', focus: 'asdf jkl; together', type: 'letters', minWpm: 7,
        patterns: ['fff jjj ddd kkk sss lll aaa ;;;', 'fjfj dkdk slsl a;a;', 'asdf jkl; fdsa lkj; asdf jkl;'] },
      { id: 'smash_home_6', title: 'The Wrench Handle · G H', focus: 'Add the G and H reaches', type: 'letters', minWpm: 8,
        patterns: ['fgf jhj fgf jhj', 'ghgh fgf jhj ghgh', 'fghj jhgf ghg fjf jhj asdfg hjkl;'] },
    ],
  },
  {
    id: 'upper_lower_overflow',
    name: 'Phase 2 · Sewer Line Extension',
    subtitle: 'Reaching up to the top rows and down to the bottom',
    lessons: [
      { id: 'mtt_upper_1', title: 'The Top Flange', focus: 'qwert yuiop', type: 'letters', minWpm: 8,
        patterns: ['frf juj ftf jyj fqf jpj faw kio', 'qwerty uiop rtyu qwer tyui op', 'fr juy fgt jhy qaws edrf tgby'] },
      { id: 'mtt_lower_1', title: 'Deep Puddle Digging', focus: 'zxcv bnm,.', type: 'letters', minWpm: 8,
        patterns: ['fzf jmj fxf jkj fcf jlj fvb jnb', 'zxcv bnm, zx cv bn m, zxcvbnm,', 'fza jm; fxd ksl fcv ldk fvb jn,'] },
    ],
  },
  {
    id: 'plumbing_jargon',
    name: 'Phase 3 · Wet World Word Clamps',
    subtitle: 'Spelling real words and plumbing terminology',
    lessons: [
      { id: 'word_swimming_1', title: 'Subsoil Drainage', focus: 'Common small words', type: 'words', minWpm: 12,
        patterns: ['pipe clogs drip vent leak tank pump sump valve seal rust moss wet flow',
                   'the water pump is clogged check the vent block',
                   'repair the rust seal with standard plumbing paste'] },
      { id: 'word_swimming_2', title: 'High-Pressure Fitting', focus: 'Longer construction terms', type: 'words', minWpm: 15,
        patterns: ['gasket flange solder wrench copper faucet fixture spigot trap elbow brass sewer bypass vacuum sensor manifold',
                   'always check the brass fixture gaskets first',
                   'solder the copper manifold before applying high pressure steam'] },
    ],
  },
  {
    id: 'professional_sentences',
    name: 'Phase 4 · Tunnel Sentences',
    subtitle: 'Complete plumbing wisdom and high-speed repair orders',
    lessons: [
      { id: 'tunnel_wisdom_1', title: "The Plumber's Creed", focus: 'Shift keys & punctuation', type: 'sentences', minWpm: 22,
        patterns: ['A leak in the subfloor can rot the timber beams quickly.',
                   'Remember: hot water on the left, cold water on the right!',
                   'Did you tighten the copper packing nut around the main valve stem?'] },
      { id: 'tunnel_wisdom_2', title: 'Industrial Boiler Crisis', focus: 'Numbers, punctuation, speed', type: 'sentences', minWpm: 28,
        patterns: ['Emergency: Boiler No. 4 is reaching critical PSI of 145!',
                   'Call Mansfield Plumbing at 1-800-FIX-PIPE immediately.',
                   'Warning: High-pressure steam line burst! Evacuate section 12-b!'] },
    ],
  },
];

/** Flatten lessons that match a phase type. */
export function lessonsOfType(type) {
  const out = [];
  for (const cat of LESSON_CATEGORIES) {
    for (const l of cat.lessons) if (l.type === type) out.push({ ...l, category: cat.name });
  }
  return out;
}

export function findLesson(id) {
  for (const cat of LESSON_CATEGORIES) {
    const l = cat.lessons.find((x) => x.id === id);
    if (l) return l;
  }
  return null;
}

/** Encouraging lines only — Charles Martinet refused to read the mean ones, so we honor that. */
export const KIND_WORDS = {
  hit:   ['Nice!', 'Clean!', 'Sealed it!', 'No drips!', 'Smooth!', 'Tight fit!'],
  streak:['On a roll!', 'Pipes are singing!', 'Full flow!', 'Pressure holding!'],
  miss:  ['Almost — try again.', "We'll patch it.", 'No worries, reset.', 'Shake it off.'],
  pass:  ['Great work — and you can go even faster!', 'You fixed it!', 'Mansfield is proud.'],
  fail:  ['Good effort — one more pass.', "Close! Let's run it again.", 'Every plumber re-tightens.'],
};

export function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
