# Parsimony, Projection, and Adversarial Consilience
### A self-hosting object machine engineered to survive its own evolution

*Scott Mansfield, with an AI pair-engineer. Draft — 2026-06-20.*

> This project is devoted to the loving memory of Billie Dean Mansfield (1945–2026).

---

## Abstract

We describe **Subsystem**, a self-hosting runtime shaped after the Windows NT executive — one object
namespace, refcounted handles as authority, a registry that *projects* the namespace rather than owning a
second copy of the truth — implemented in-process on CoreCLR + PowerShell 7. Subsystem is not primarily a
feature set; it is a **discipline made structural**. Its design is organized around three claims that we
argue are facets of one principle:

1. **Projection.** There is exactly one source of truth (the object manifold); everything observable — the
   registry, the UI, cross-process buffers, the console — is a lossy *projection* of it. Nothing downstream
   may hold truth.
2. **One primitive.** A single dataflow mechanism — *DirectPort*: push-based, zero-copy, fenced,
   latest-wins, non-locking, best-effort, with `WaitAny` (switchboard) / `WaitAll` (barrier) as its only
   synchronization — recurs at every scale: object interop, inter-process and GPU sharing, compute-graph
   execution, and device comms. It is the executive's object manager generalized to cross-process scope.
3. **Adversarial consilience.** The system's correctness and its self-description are governed by a single
   epistemic stance: a claim — about code, about a cross-domain analogy, about a generation of the binary —
   is *untrusted until it survives a test severe enough for its stakes that a false version would have
   failed.* This is the immune system that lets a self-rewriting machine evolve without propagating its own
   defects.

The motivating failure is concrete: NT shipped a parsimonious executive and let one personality (Win32)
bloat, migrate into the kernel, and accrete without pruning until the clean core was buried. Subsystem is
the corrective — an executive that stays parsimonious *by construction*, and which is being engineered to
take over its own selection pressure so that it survives without its designers.

---

## 1. The failure we are correcting

Windows NT, as designed by Cutler's team, was elegant: a small executive (Object Manager, one namespace,
a configuration manager whose registry *hives* are durable planes) with multiple environment subsystems —
Win32, POSIX, OS/2 — as user-mode **peers**. Three things cursed it:

- **Monoculture.** Win32 won; POSIX and OS/2 withered. The multi-personality design became dead weight.
- **Contamination.** For graphics performance, Win32's window and graphics manager was hauled *into the
  kernel* (`win32k.sys`, NT 4.0). The pure executive acquired a large, stateful, attack-prone personality
  welded into its core. Microkernel purity was traded for one personality's framerate.
- **Accretion.** Win32's backward-compatibility-forever mandate meant nothing was ever removed. The clean
  core was buried under undeletable API sediment.

The lesson is not "NT was bad." NT's *executive* was right; its *governance* failed. Subsystem keeps the
executive and replaces the governance with structural parsimony and an adversarial immune system.

---

## 2. The invariants (the executive)

Six invariants are enforced, not aspired to. Each maps directly to one of NT's failure modes.

| # | Invariant | The failure it forecloses |
|---|---|---|
| 1 | One object namespace | Fragmented, forkable truth |
| 2 | Handle = authority (refcounted; free-at-zero) | Ambient authority, leaks |
| 3 | The registry *projects* the namespace | A second store that drifts |
| 4 | The UI is a presenter that **holds nothing** | The `win32k` contamination — a personality moving truth into the core |
| 5 | Behaviors are **verbs** from a **closed vocabulary**, token-gated | API sprawl / accretion |
| 6 | No subsystem holds its own truth | Monoculture-by-fragmentation |

Invariant 5 is the direct anti-accretion mechanism: the method vocabulary is a fixed set
(`Create Open Close Query Set Enumerate … Mount Bind Grant Revoke … Remedy`). You cannot mint a fiftieth
verb to paper over a design gap; you must fit the closed set or justify extending it. Much of the
engineering discipline this project enforces is, in the end, *refusing to add a synonym.*

---

## 3. Projection as the core ontology

The object manifold (the VOM) is the complete, authoritative state. Everything else is a **projection** —
a finite, lossy view that cannot contain the whole:

- the **registry** projects the namespace (invariant 3);
- the **UI** is a projection that holds nothing (invariant 4);
- a **console/PTY** is a lossy fallback projection for foreign processes;
- **DirectPort** (§4) is the VOM projected to cross-process / GPU scope.

The shape is not unique to computing — it is the cartographer's problem: you cannot flatten a globe onto a
flat map without distortion — a theorem, not a folk saying (Gauss's *Theorema Egregium*, 1827: a surface's
curvature is intrinsic, so a sphere cannot be flattened to a plane without stretching) — so every map is a lossy *projection* of one round truth it can never fully
contain. The registry, the UI, the buffers, and the console are those maps; the object manifold is the
globe. That the same structure recurs across unrelated domains is exactly the signal §7 is about.
("Projection" is here a *boundary object* — a term each field reads in its own dialect.)

---

## 4. DirectPort: one primitive at every scale

DirectPort is a named, fenced, 256-aligned, format-agnostic shared region with **push / latest-wins /
non-locking / best-effort** semantics. Its *only* synchronization is a fence with two operations:
**`WaitAny` = a switchboard** (fire when any input is ready) and **`WaitAll` = a barrier** (join when all
are). A producer publishes by an atomic counter exchange and a fence signal; consumers dirty-read the
latest. Reliability, when needed, rides out-of-band; the data plane stays best-effort.

The thesis is that this is not "a transport" but **the executive's dataflow verb**, and that it recurs at
every scale:

| Scale | The same primitive |
|---|---|
| Object interop (shell ⇄ VOM) | the WebView DirectPort adapter — the UI is a region consumer |
| Inter-process / GPU sharing | VirtuaCam: producers → broker (an N→1 *normalizer*) → a virtual camera |
| Compute graph | a DAG node fires on `WaitAny` of its inputs, joins on `WaitAll` — the basis of an ONNX graph executor and D3D12/SPIR-V compute kernels in sibling projects |
| Device comms | the same fenced region as the zero-copy local rung of a transport ladder |

A handle plus a fence *is* the object manager's refcount-plus-signal at cross-process scope. Hence:
**DirectPort = the VOM at GPU/cross-process scope.** The same mechanism appears at every scale of the
system — in-process object, cross-process buffer, GPU resource, network frame — so a reader who understands
it once understands the system everywhere. This scale-invariance is not an aesthetic claim; it is the
property that keeps the system small and auditable: there is *one* mechanism to learn, verify, and harden,
not a dozen scale-specific ones. That economy is the point — it is *why we do it this way* — and it is not a
preference but a named result: Saltzer & Schroeder's **economy of mechanism** (1975), one of the eight
classical security design principles (a smaller mechanism has fewer parts to be wrong and a smaller attack
surface), and Brooks's **conceptual integrity** (1975), which holds that one coherent design beats a sum of
independently good features. The receipts are in the references — not in our say-so.

A direct architectural consequence (see §6 and §9): the DirectPort contract is *foundational*, not a leaf.
Where its wire format currently lives inside a per-platform binding, that is an authority inversion to be
corrected by promoting the contract toward the root.

---

## 5. Parsimony by construction

Parsimony here is **conceptual, not byte-count.** A self-contained binary that bundles its runtime is large;
that is not the metric. The metric is: *could a cold auditor interrogate the code, the registry, and the
hierarchy and conclude "parsimonious" without being told?* The structural commitments that earn that:

- **Folders ≈ namespace ≈ DAG**, with the **namespace as the single source of truth**; the source-folder
  layout is a convenience projection that is *allowed to diverge* at per-head seams. (Claiming a perfect
  three-way identity would be the lie; the honest claim is one truth with two approximations.)
- **One name per concept.** Synonyms are sediment. (This session collapsed a ticketing vocabulary —
  `ticket` / `Open-Ticket` / a migration verb / a plural alias — to a single discipline: the verb *Remedy*
  opens a record, the noun is the record type, the word "ticket" is banished.)
- **No junk drawers.** A leaf has exactly one correct home; a catch-all component is decomposed until it
  does.
- **Prune-when-served = emancipate.** Removing a mature capability does not mean deletion; it means
  *spinning it out into its own project*, because every seam-mounted leaf is already a self-sufficient
  object node. The Win32 curse moved personalities *into* the core; Subsystem moves them *out*.

The word "parsimonious" does not appear in the codebase. A system that captions its own virtue is
advertising a virtue it has not earned; the structure must *exude* it, and self-description (§8) must
*reveal* it.

---

## 6. The regress of trust

A self-hosting machine cannot escape the question *where does trust bottom out?* The classic
interrogations — Thompson's **"trusting trust,"** Juvenal's **"who watches the watchmen,"** the
**argument from authority** ("whose authority?") — are one question in three coats, formally the
**Münchhausen trilemma**: every justification regresses forever, loops, or halts on an axiom. The
discipline is to chase the regress one step past comfortable and refuse the comfortable stop.

Subsystem's groundings:

| Interrogation | Grounding | Status |
|---|---|---|
| Argument from authority — whose? | The **binary + a severe test**, never a person, doc, or training prior. The sole authority-by-fiat is the dedication, grounded in love and gated as structurally unremovable — a consciously chosen single axiom. | **built** |
| Trusting Trust (Thompson, 1984) | A self-compiling machine *is* the Thompson scenario. **Correction (a landed external review):** the two build paths (`ss build self` in-proc Roslyn; `dotnet`) are *both Roslyn* — that is *identical* double-compiling, not *diverse*, so a Roslyn-resident backdoor survives the comparison. What it actually buys is a **reproducibility / determinism** check, not Wheeler's countermeasure. True DDC needs an *independent* front-end (historically Mono's `mcs`; now scarce — C# is effectively a Roslyn monoculture), which is **unbuilt**. | **open — blocked on an independent compiler** |
| Who watches the watchmen? | The gate (the analyzer ratchet) watches the code. *Nothing yet watches the gate*; its accepted-violation baseline is itself un-audited sediment. | **open** |

The third row is stated plainly because an honest paper marks its open regress steps rather than papering
them.

---

## 7. Adversarial consilience (the epistemic spine)

**Consilience** (Whewell, 1840; Wilson, 1998) is the convergence of independent domains on the *same
structure*, where the convergence itself is the warrant. Its practical value is **attention triage** —
*where to point the flashlight.* A structure that recurs across the NT object model, ITSM record-keeping,
a GPU dataflow primitive, a compiler's link-checker, and (structurally) a cosmology draft has earned
scrutiny and build effort; a structure visible in only one domain — or only in the observer's projection —
has not.

Consilience has an evil twin: **apophenia**, the observer projecting a rhyme that is not load-bearing.
The discipline that separates them is **adversarial**: you do not collect confirmations (cheap, and
apophenia thrives on them); you *try to break the correspondence* and credit only what survives. The
rigorous form is Mayo's **severity** — credit a claim to the degree it passed a test it *would very likely
have failed if false* — with antecedents in Popper's falsification and Kahneman's adversarial
collaboration.

We name the working stance **adversarial consilience**:

> *A cross-domain structure (or a code claim, or a generation of the binary) is untrusted until it survives
> a test severe enough for its stakes that a false version would have failed; what survives gets the
> flashlight. The attack is how one avoids assuming — "when we assume, we make an ass out of u and me."*

This is not a new epistemics bolted on; it is the system's existing posture pointed at ideas. The gate is
**fail-closed** (red until proven green); the model is **treated as untrusted**; self-description is
**cite-or-refuse**. Adversarial consilience is the same stance applied one level up — which is, itself, a
consilience. Its one failure mode is corrosiveness: attack everything forever and you build nothing, or you
reject true structures because no finite test is perfectly severe. The governor is a **stopping rule:
severity calibrated to stakes** — test as hard as the blast radius demands, then commit and build
(directional correctness, not certainty).

---

## 8. The living onboarder: self-description that cannot rot

Static documentation rots; this project has watched its own notes lie. The same is true of an agent's
hand-written memory. The cure is to make operating procedures **derived, not stored**, and to make their
citations **compiler-verifiable** so a stale one fails loudly instead of misleading quietly. Two pieces of
existing prior art compose into the mechanism:

- **Roslyn `DocumentationCommentId`** is a canonical, symbol-resolvable reference (`T:Ns.Type`,
  `M:Ns.Type.Method(...)`) — immune to line drift, with a dangling reference already a diagnostic
  (`CS1574`).
- **rustdoc's `deny(broken_intra_doc_links)`** makes a dangling doc link a *build error*, not silent rot.

Compose them: every node of a procedure tree carries a `DocumentationCommentId`; `ss` resolves it against
the *live* compilation each call and pulls the explanation from the **symbol's own doc-comment** (one
source, never duplicated); a citation that fails to resolve **refuses** (and a gate analyzer fails the
build — rustdoc's `deny`, ported). Navigation is **drilldown/breadcrumb over the namespace = DAG**. The
result: rot requires a citation to *silently* point at something changed, and "silently" is made
impossible — it resolves live or it goes red. Even *doctrine* can be anchored this way (a typed policy
whose members cite the mechanisms they govern), so the rules and the code they govern cannot drift apart.

Status: the symbol pipeline (`ss refs`, `ss map`, `ss contextualize`) is **built**; the procedure-tree
verb and its `deny`-analyzer are **conjectured** and specified.

---

## 9. The machine as a generationally-evolving Lisp machine

Step back and Subsystem is a **generationally-evolving, image-based machine** in the lineage of the Lisp
machine and the Smalltalk image: it carries its own source, rebuilds itself generation over generation
(`ss build self`, reproducing gen→gen with no external compiler on the Windows path), and describes itself
from the binary. Its growth discipline mirrors **NEAT** (Stanley & Miikkulainen, 2002): complexify from a
minimal start, preserve the innovations that work, *speciate* the rest — which maps cleanly onto parsimony
(minimal start, justified growth) and emancipation (speciation into sibling projects).

The honest status — and the heart of the program — is this: **NEAT requires a fitness function, and right
now the fitness function is its designers.** Generations are currently selected by the gate (a weak,
largely syntactic signal) and by human judgment (itself an argument from authority — *who watches that?*).
**Today we are the intelligent designers; the telos is to hand selection to the machine** by building an
*objective, adversarial* fitness function — the severe test, cite-or-refuse, the diverse double-compile —
so that no generation ships that a worse one would not have failed. Intelligent design giving way to
natural selection is not a metaphor here; it is the explicit roadmap. **The fitness function is the
under-built organ of the machine.**

This is also why §6 and §7 are existential rather than ornamental: a self-rewriting machine *without* an
adversarial immune system propagates generation N's backdoor, rot, or apophenic drift into every
descendant invisibly — Thompson's exact warning, now recursive across time.

---

## 10. Open problems (the falsifiable roadmap)

Stated as severe tests the program must pass, in dependency order:

1. **The VOM kernel boundary.** "DirectPort carries the executive" and "emancipate to its own VOM" both
   presuppose a drawn boundary between a sub-VOM's authority and its parent's. Until drawn, the recursion
   and the spin-off model rest on wet concrete.
2. **Authority-inversion promotions.** Concrete instances already exist: the DirectPort wire contract is
   declared in a per-platform binding (it belongs near the root), and an integrity→security-descriptor
   projection lives in a presenter (it belongs in the configuration manager). Each forces a duplicate the
   moment a second consumer appears. Promote to an upstream broker — the pattern the runtime broker already
   exemplifies — *before* the second consumer cements the duplication.
3. **The fitness function (§9).** The single largest piece of unbuilt machinery; without it the machine
   cannot survive on its own.
4. **Who watches the gate (§6).** Drain the accepted-violation baseline toward zero and make the gate
   self-auditing.
5. **Literal diverse double-compiling.** Build `ss.exe` with both compilers and diff the artifact — turn
   "multiplicity kills drift" from a slogan into a passing test.
6. **The living onboarder + its `deny`-analyzer (§8).** Make rot structurally impossible, then collapse
   hand-written memory to a seed pointer plus genuinely non-derivable intent.

---

## 11. Conclusion

Subsystem is an attempt to keep the part of NT that was right — a parsimonious object executive — and to
replace the governance that failed it. Three commitments do the work: **projection** (one truth, lossy
views, nothing downstream holds truth), **one primitive** (DirectPort's push/fence/`WaitAny`-`WaitAll`
dataflow, recognizable at every scale), and **adversarial consilience** (a claim is untrusted until it
survives a test a false version would have failed). The first keeps the architecture honest; the second
keeps it small; the third lets it *evolve* without rotting.

The machine is, today, intelligently designed — by a solo engineer and an AI pair, hand-selecting each
generation. The goal is to make it deserve natural selection: to build the adversarial fitness function
that lets it survive on its own. The only axiom we adopt without a severe test is the one we chose on
purpose, and gated so it can never be removed — the dedication this document opens with.

---

## 12. Amending this document

This paper is canon, not a working draft. Changing it must clear the bar the system holds its code to —
**adversarial consilience turned on the paper itself**:

1. **Root-cause the failure** — state precisely *where*, *why*, and *how* the current text fails. (This is
   the 5-whys / root-cause discipline; we take its analytical core, not Six Sigma's manufacturing
   variance-reduction machinery, which does not map to a one-off thesis.)
2. **Provide a demonstrably better alternative**, shown to survive a test the current text would have failed.
3. **Prefer a conservative extension** — re-role or extend without invalidating prior results; where
   invalidation is required it must be an explicit, documented *refutation*, never a silent overwrite.

Stated honestly (the regress of §6 again): *who adjudicates the amendment test?* Today, the authors — an
un-watched watchman until the fitness function of §9 can score it. **Authority here is the severe test,
never the seniority or credentials of the proposer.** Every onboarding session is pointed at this document
as the telos; `ss onboard` resolves it (the why), then the live binary (the what).

---

## References

1. K. Thompson, "Reflections on Trusting Trust," *Communications of the ACM*, 1984.
2. D. A. Wheeler, "Fully Countering Trusting Trust through Diverse Double-Compiling," 2009.
3. W. Whewell, *The Philosophy of the Inductive Sciences*, 1840 (consilience of inductions).
4. E. O. Wilson, *Consilience: The Unity of Knowledge*, 1998.
5. D. G. Mayo, *Statistical Inference as Severe Testing*, 2018.
6. K. Popper, *The Logic of Scientific Discovery*, 1959.
7. D. Kahneman et al., on adversarial collaboration.
8. K. O. Stanley & R. Miikkulainen, "Evolving Neural Networks through Augmenting Topologies" (NEAT), 2002.
9. J. Worrall, "Structural Realism: The Best of Both Worlds?", 1989; on universality, K. G. Wilson (RG).
10. S. L. Star & J. R. Griesemer, "Institutional Ecology, 'Translations' and Boundary Objects," 1989.
11. H. Albert, *Treatise on Critical Reason* (the Münchhausen trilemma), 1968.
12. Roslyn `DocumentationCommentId`; rustdoc lint `broken_intra_doc_links`.
13. D. Hofstadter & E. Sander, *Surfaces and Essences: Analogy as the Fuel and Fire of Thinking*, 2013 — analogy as the engine of cognition (the cognitive basis of consilience).
14. Conservative extension (proof/model theory) — a theory added without proving anything new in the base language; the formal form of "re-role without invalidating."
15. Heredity — generational inheritance of structure (biology); here, the gene-transfer across §9's self-build generations. (The author's "cosmological heredity" framing is unpublished and is **not** cited as evidence.)
16. J. Saltzer & M. Schroeder, "The Protection of Information in Computer Systems," *Proc. IEEE* 63(9), 1975 — the design principle of **economy of mechanism**.
17. F. Brooks, *The Mythical Man-Month*, 1975 — **conceptual integrity** as the primary design virtue.
18. I. Lakatos, *The Methodology of Scientific Research Programmes*, 1978 — a programme is *progressive* iff it predicts novel facts; the standard by which a thesis like this earns continuation rather than abandonment.
19. C. F. Gauss, *Disquisitiones generales circa superficies curvas* (the *Theorema Egregium*), 1827 — Gaussian curvature is intrinsic; a sphere (K>0) cannot be isometrically mapped to a plane (K=0), so every flat map distorts. The rigorous basis for §3's cartographer's analogy.
20. N. A. Tissot, *Mémoire sur la représentation des surfaces*, 1881 (Tissot's indicatrix) — the cartographic measure of that unavoidable per-point distortion.

*Status legend used throughout: **built** = present in `ss.exe` today; **runnable/conjectured** = specified,
not yet wired; **open** = unsolved. This paper is itself held to cite-or-refuse: claims of "built" are
checkable against the binary.*
