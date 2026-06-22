import { LinearTyper, buildStream, buildTargets, didPass } from '../js/engine.js';
import { fingerFor, keyMatches, needsShift, fingerLabel } from '../js/finger.js';
import { benchmarkGhost, GhostRecorder, rivalGhosts } from '../js/ghost.js';
import { LESSON_CATEGORIES, lessonsOfType, findLesson } from '../js/lessons.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  x', m); } };

const lt = new LinearTyper('fj');
let r = lt.type('f'); ok(r.correct && r.advanced, 'type f advances');
r = lt.type('x'); ok(!r.correct && lt.badAt === 1, 'wrong key flags bad');
r = lt.type('j'); ok(r.correct && r.finished, 'finishing j finished');
ok(lt.metrics.snapshot().total === 3 && lt.metrics.snapshot().correct === 2, 'metrics 2/3');
ok(lt.metrics.accuracy() === 67, 'accuracy ~67');

ok(fingerFor('f').hand === 'left' && fingerFor('f').finger === 'index', 'f=left index');
ok(fingerFor('j').hand === 'right', 'j=right');
ok(fingerFor(' ').finger === 'thumb', 'space=thumb');
ok(keyMatches(';', ':'), '; matches :');
ok(keyMatches('1', '!'), '1 matches !');
ok(needsShift('A') === 'right', 'A needs right shift');
ok(needsShift('a') === null, 'a no shift');
ok(typeof fingerLabel('q') === 'string', 'finger label');

const lesson = findLesson('smash_home_1');
ok(lesson && lesson.type === 'letters', 'found smash_home_1');
ok(buildTargets(lesson, 'char').every(c => c.length === 1), 'char granularity');
ok(buildTargets(findLesson('word_swimming_1'), 'word').includes('pipe'), 'word targets');
ok(buildStream(lesson).length > 0, 'stream builds');
ok(didPass(lesson, { wpm: 20, accuracy: 90 }), 'passes above goal');
ok(!didPass(lesson, { wpm: 5, accuracy: 90 }), 'fails slow');

const gh = benchmarkGhost(60, 100, 'Par');
ok(Math.abs(gh.durationMs() - 20000) < 50, 'benchmark ~20s');
ok(gh.progressAt(0) === 0 && Math.abs(gh.progressAt(10000) - 0.5) < 0.05, 'halfway at 10s');
ok(gh.progressAt(999999) === 1, 'clamps to 1');
const rec = new GhostRecorder(); rec.start(); rec.sample(0.5); const s = rec.finish(1);
ok(s.length >= 2 && s[s.length - 1].p === 1, 'recorder end');
ok(rivalGhosts(100).length === 4, '4 rivals');

ok(lessonsOfType('words').length >= 2, 'words lessons');
ok(LESSON_CATEGORIES.length === 4, '4 phases');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
