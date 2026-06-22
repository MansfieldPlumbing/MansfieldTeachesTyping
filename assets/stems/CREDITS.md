# Guitar God — audio credits

## Song

**"Fight Back" by NEFFEX** — used under NEFFEX's "free to use with credit" terms.

> Music: "Fight Back" by NEFFEX
> NEFFEX releases copyright-free music free to use with credit. https://neffex.com

The six stems in `neffex_fight_back/` (`bass, drums, guitar, other, piano,
vocals`) were produced by separating the original track with the repo owner's
own tool, **demucs_v4_trt** (https://github.com/MansfieldPlumbing/demucs_v4_trt),
which runs Demucs v4 (htdemucs_6s) via TensorRT.

## Boo / audience

`boo.mp3` — short crowd "boo" sourced from the Freesound community
(freesound.org), used per its Creative Commons terms. Replace with a cleared
asset if redistributing commercially.

## Swapping in a different song

Drop a new folder under `assets/stems/<song>/` containing the six stem files
(plus `boo.mp3`) and point `new StemPlayer('<song>')` at it in
`js/modes/guitar.js`. The note chart is generated automatically from the audio
(onset detection), so no manual charting is needed.
