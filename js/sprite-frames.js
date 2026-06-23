/* Frame atlas for assets/sprites/mansfield.png — the real pixel sprite sheet
   (man-bun plumber), keyed off its green screen and downscaled by tests/
   _mksprite.mjs. Boxes are [sx, sy, sw, sh] in the sheet's own pixels; the
   renderer in sprite.js bottom-centers each frame so feet stay planted.

   Sheet rows (from the labelled template):
     row0 IDLE   row1 WALK   row2 JUMP(+2 misc)   row3 DUCK+HURT
     row4 CLIMB+ATTACK   row5 POWERUP   row6 DEATH+VICTORY */

export const SHEET_SRC = 'assets/sprites/mansfield.png';

const R0 = [[126,10,53,97],[225,10,53,97],[326,10,52,97],[426,10,53,97]];
const R1 = [[126,120,57,95],[226,120,59,96],[330,120,51,95],[429,120,55,97],[527,118,56,97],[622,118,63,93],[730,118,51,99],[827,118,57,97],[925,118,60,99],[1030,118,54,97],[1127,118,59,94]];
const R2 = [[127,234,53,94],[224,234,58,94],[325,222,60,91],[425,222,61,97],[525,230,54,97],[628,237,57,91],[1030,240,52,89],[1131,243,54,86]];
const R3 = [[24,337,74,99],[124,347,62,91],[232,359,51,80],[329,354,52,84],[428,349,56,89],[529,369,63,66],[624,351,60,87],[927,351,54,88],[1033,345,50,94],[1127,344,59,90],[1216,352,75,86],[1319,343,78,90]];
const R6 = [[113,683,81,62],[219,672,59,94],[318,669,74,69],[413,688,81,61],[508,687,91,78],[811,667,74,98],[914,668,73,97]];

export const FRAMES = {
  idle:    R0,
  run:     R1,
  jump:    R2.slice(0, 6),     // last 2 of row2 are misc poses, not jump
  hurt:    [R3[7], R3[8]],     // DAMAGE/HURT, right block of row3
  duck:    R3.slice(1, 7),
  victory: [R6[5], R6[6]],     // thumbs-up celebration, right block of row6
};
