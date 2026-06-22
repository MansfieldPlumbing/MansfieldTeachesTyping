# Guitar God — audio credits

## Song

**"Fight Back" by NEFFEX** — used under NEFFEX's "free to use with credit" terms.

> Music: "Fight Back" by NEFFEX
> NEFFEX releases copyright-free music free to use with credit. https://neffex.com

The track was separated into six stems (`bass, drums, guitar, other, piano,
vocals`) with the repo owner's own tool, **demucs_v4_trt**
(https://github.com/MansfieldPlumbing/demucs_v4_trt), which runs Demucs v4
(htdemucs_6s) via TensorRT.

To keep the web download light, the five non-guitar stems are mixed down to a
single **`backing.mp3`** and the **`guitar.mp3`** is kept separate (it's the one
that muffles when you miss). Both are re-encoded to ~96–112 kbps mono — the
whole song is ~5 MB instead of ~46 MB.

## Boo / audience

`boo.mp3` — short crowd "boo" sourced from the Freesound community
(freesound.org), used per its Creative Commons terms. Replace with a cleared
asset if redistributing commercially.

## Swapping in a different song

Drop a new folder under `assets/stems/<song>/` containing `backing.mp3`,
`guitar.mp3` and `boo.mp3`, then point `new StemPlayer('<song>')` at it in
`js/modes/guitar.js`. The note chart is generated automatically from the audio
(onset detection), so no manual charting is needed.
