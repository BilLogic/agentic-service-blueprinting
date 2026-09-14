# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sample-board.spec.ts >> the bundled sample board >> renders every phase, scenario, path and layout without a console error
- Location: render-walk/sample-board.spec.ts:323:3

# Error details

```
Error: 1 browser error while walking the sample board:
  /
    console.error: render-walk self-test: injected
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - button "Home" [ref=e6] [cursor=pointer]
    - tablist "Open views" [ref=e7]:
      - tab "Agentic Service Blueprint" [selected] [ref=e9] [cursor=pointer]
    - generic "No database configured — every board here is the template's bundled sample. Connect one and it is replaced by your own rows, including where they are empty." [ref=e11]: sample data
  - generic [ref=e12]:
    - complementary "Workspace navigation" [ref=e13]:
      - generic [ref=e15]:
        - navigation "Sidebar surfaces" [ref=e16]:
          - button "Collapse sidebar" [ref=e17] [cursor=pointer]
          - button "Blueprints" [pressed] [ref=e19] [cursor=pointer]
          - button "Slices" [ref=e25] [cursor=pointer]
          - button "Switch to dark theme" [ref=e28] [cursor=pointer]
          - button "Agent settings" [ref=e31] [cursor=pointer]
        - generic [ref=e38]:
          - button "Phases" [expanded] [ref=e40] [cursor=pointer]
          - generic [ref=e48]:
            - generic [ref=e49]:
              - generic [ref=e50]:
                - button "Collapse Discover" [expanded] [ref=e51] [cursor=pointer]
                - button "Discover" [ref=e54] [cursor=pointer]
              - list [ref=e57]:
                - listitem [ref=e58]:
                  - button "Find the template and see what it does" [ref=e61] [cursor=pointer]
            - generic [ref=e62]:
              - generic [ref=e63]:
                - button "Collapse Setup" [expanded] [ref=e64] [cursor=pointer]
                - button "Setup" [ref=e67] [cursor=pointer]
              - list [ref=e70]:
                - listitem [ref=e71]:
                  - button "Map your service" [ref=e74] [cursor=pointer]
            - generic [ref=e75]:
              - generic [ref=e76]:
                - button "Collapse Operate" [expanded] [ref=e77] [cursor=pointer]
                - button "Operate" [ref=e80] [cursor=pointer]
              - list [ref=e83]:
                - listitem [ref=e84]:
                  - button "Audit the check roster" [ref=e87] [cursor=pointer]
                - listitem [ref=e88]:
                  - button "Ideate a change (what-if)" [ref=e91] [cursor=pointer]
                - listitem [ref=e92]:
                  - button "Slice for an audience" [ref=e95] [cursor=pointer]
            - generic [ref=e96]:
              - generic [ref=e97]:
                - button "Collapse Maintain" [expanded] [ref=e98] [cursor=pointer]
                - button "Maintain" [ref=e101] [cursor=pointer]
              - list [ref=e104]:
                - listitem [ref=e105]:
                  - button "Keep it current" [ref=e108] [cursor=pointer]
      - separator "Resize sidebar" [ref=e109]
    - main [ref=e110]:
      - generic [ref=e115]:
        - paragraph [ref=e120]: Supabase is not configured
        - generic [ref=e122]:
          - generic [ref=e127]:
            - button "Open Discover phase" [ref=e128] [cursor=pointer]:
              - button "01 · Discover" [ref=e129]
              - generic [ref=e133]:
                - button "Find the template and see what it does" [ref=e134]
                - button "Open Find the template and see what it does scenario" [ref=e136]:
                  - generic [ref=e140]:
                    - generic [ref=e141]:
                      - generic: Land on the repo
                      - button "What is a step?"
                    - generic [ref=e142]:
                      - generic: Read what it claims
                      - button "What is a step?"
                    - generic [ref=e143]:
                      - generic: Open the sample board
                      - button "What is a step?"
                    - generic [ref=e144]:
                      - generic: Run it with nothing configured
                      - button "What is a step?"
                    - generic [ref=e145]:
                      - generic: Decide it fits
                      - button "What is a step?"
                    - generic [ref=e146]:
                      - button "A first look" [ref=e147]
                      - generic [ref=e151]:
                        - generic: Stakeholders
                        - button "What is a lane?"
                      - generic [ref=e154]:
                        - generic: Blueprint owner
                        - button "What is a lane?"
                      - separator "LINE OF INTERACTION" [ref=e156]:
                        - button "LINE OF INTERACTION" [ref=e158]
                      - generic [ref=e162]:
                        - generic: App & skill surface
                        - button "What is a lane?"
                      - generic [ref=e165]:
                        - generic: Claude in the IDE
                        - button "What is a lane?"
                      - separator "LINE OF VISIBILITY" [ref=e166]:
                        - button "LINE OF VISIBILITY" [ref=e168]
                      - generic [ref=e172]:
                        - generic: Pipeline scripts
                        - button "What is a lane?"
                      - generic [ref=e175]:
                        - generic: Subagent fleet
                        - button "What is a lane?"
                      - generic [ref=e178]:
                        - generic: References & guardrails
                        - button "What is a lane?"
                      - generic [ref=e181]:
                        - generic [ref=e182]:
                          - button
                        - generic [ref=e190]:
                          - button
                      - generic [ref=e193]:
                        - generic [ref=e194]:
                          - button
                        - generic [ref=e196]:
                          - button
                        - generic [ref=e198]:
                          - button
                        - generic [ref=e200]:
                          - button
                        - generic [ref=e202]:
                          - button
                      - separator [ref=e204]
                      - generic [ref=e208]:
                        - generic [ref=e214]:
                          - button "Cover page"
                          - button "Overview canvas"
                        - generic [ref=e217]:
                          - button "Vite dev server"
                          - button "No-DB mode"
                      - generic [ref=e231]:
                        - button
                      - separator [ref=e232]
                      - generic [ref=e236]:
                        - generic [ref=e244]:
                          - button "generate_sample_blueprint.mjs"
                        - generic [ref=e247]:
                          - button "run_tests.sh"
                          - button "agent-harness --smoke"
                      - generic [ref=e252]:
                        - generic [ref=e256]:
                          - button "README.md"
                        - generic [ref=e259]:
                          - button "guide/01 — the blueprint model"
                        - generic [ref=e264]:
                          - button "AGENTS.md"
                          - button "guide/03 — the plugin"
            - button "Open Setup phase" [ref=e265] [cursor=pointer]:
              - button "02 · Setup" [ref=e266]
              - generic [ref=e270]:
                - button "Map your service" [ref=e271]
                - button "Open Map your service scenario" [ref=e273]:
                  - generic [ref=e277]:
                    - generic [ref=e278]:
                      - generic: Invoke sb:map
                      - button "What is a step?"
                    - generic [ref=e279]:
                      - generic: Route by what exists
                      - button "What is a step?"
                    - generic [ref=e280]:
                      - generic: Scope and settle the spine
                      - button "What is a step?"
                    - generic [ref=e281]:
                      - generic: Read the sources
                      - button "What is a step?"
                    - generic [ref=e282]:
                      - generic: Draft the structure
                      - button "What is a step?"
                    - generic [ref=e283]:
                      - generic: Validate and review
                      - button "What is a step?"
                    - generic [ref=e284]:
                      - generic: Sign off per scenario
                      - button "What is a step?"
                    - generic [ref=e285]:
                      - generic: Import and verify
                      - button "What is a step?"
                    - generic [ref=e286]:
                      - generic: Deploy
                      - button "What is a step?"
                    - generic [ref=e287]:
                      - button "From your documents" [ref=e288]
                      - generic [ref=e292]:
                        - generic: Journey figures
                        - button "What is a lane?"
                      - generic [ref=e295]:
                        - generic: Stakeholders
                        - button "What is a lane?"
                      - generic [ref=e298]:
                        - generic: Blueprint owner
                        - button "What is a lane?"
                      - separator "LINE OF INTERACTION" [ref=e300]:
                        - button "LINE OF INTERACTION" [ref=e302]
                      - generic [ref=e306]:
                        - generic: App & skill surface
                        - button "What is a lane?"
                      - generic [ref=e310]:
                        - generic: Claude in the IDE
                        - button "What is a lane?"
                      - separator "LINE OF VISIBILITY" [ref=e311]:
                        - button "LINE OF VISIBILITY" [ref=e313]
                      - generic [ref=e317]:
                        - generic: Pipeline scripts
                        - button "What is a lane?"
                      - generic [ref=e320]:
                        - generic: Subagent fleet
                        - button "What is a lane?"
                      - generic [ref=e323]:
                        - generic: References & guardrails
                        - button "What is a lane?"
                      - generic [ref=e326]:
                        - generic [ref=e328]:
                          - button "Step storyboard"
                        - generic [ref=e333]:
                          - button "Step storyboard"
                        - generic [ref=e338]:
                          - button "Step storyboard"
                        - generic [ref=e347]:
                          - button "Step storyboard"
                      - generic [ref=e352]:
                        - generic [ref=e353]:
                          - button
                        - generic [ref=e355]:
                          - button
                        - generic [ref=e357]:
                          - button
                        - generic [ref=e359]:
                          - button
                        - generic [ref=e361]:
                          - button
                        - generic [ref=e363]:
                          - button
                        - generic [ref=e365]:
                          - button
                        - generic [ref=e369]:
                          - button
                      - separator [ref=e371]
                      - generic [ref=e375]:
                        - generic [ref=e387]:
                          - button "sb:map preview"
                          - button "Cell detail panel"
                          - button "Compare view"
                        - generic [ref=e392]:
                          - button "Imported scenario"
                          - button "read back live"
                      - generic [ref=e398]:
                        - generic [ref=e399]:
                          - button
                        - generic [ref=e401]:
                          - button
                        - generic [ref=e403]:
                          - button
                        - generic [ref=e405]:
                          - button
                        - generic [ref=e407]:
                          - button
                        - generic [ref=e409]:
                          - button
                        - generic [ref=e411]:
                          - button
                        - generic [ref=e413]:
                          - button
                        - generic [ref=e415]:
                          - button
                      - separator [ref=e416]
                      - generic [ref=e420]:
                        - generic [ref=e424]:
                          - button "blueprint-workspace.json"
                        - generic [ref=e429]:
                          - button "ingest-playbook.md"
                        - generic [ref=e432]:
                          - button "blueprint/blueprint.json"
                        - generic [ref=e435]:
                          - button "validate_ir.py (stdlib-only)"
                        - generic [ref=e438]:
                          - button "compute_signoff_hash.py"
                        - generic [ref=e441]:
                          - button "generate_fallbacks.py --register"
                          - button "generate_seed_sql.py"
                      - generic [ref=e446]:
                        - generic [ref=e453]:
                          - button
                        - generic [ref=e457]:
                          - button
                        - generic [ref=e463]:
                          - button
                      - generic [ref=e466]:
                        - generic [ref=e468]:
                          - button "elicitation-protocol.md"
                        - generic [ref=e473]:
                          - button "lane-roles.md"
                          - button "lane-vocabulary.md"
                        - generic [ref=e478]:
                          - button "data-model.md"
                          - button "ir-schema.json"
                        - generic [ref=e483]:
                          - button "validate_ir_on_edit.py — re-validates the blueprint file on every edit"
                        - generic [ref=e486]:
                          - button "secret_guard.py — the service-role key never reaches disk or transcript"
                        - generic [ref=e489]:
                          - button "deploy-notes.md"
            - button "Open Operate phase" [ref=e490] [cursor=pointer]:
              - button "03 · Operate" [ref=e491]
              - generic [ref=e494]:
                - generic [ref=e495]:
                  - button "Audit the check roster" [ref=e496]
                  - button "Open Audit the check roster scenario" [ref=e498]:
                    - generic [ref=e502]:
                      - generic [ref=e503]:
                        - generic: Name the scope
                        - button "What is a step?"
                      - generic [ref=e504]:
                        - generic: Export once
                        - button "What is a step?"
                      - generic [ref=e505]:
                        - generic: Dispatch the auditors
                        - button "What is a step?"
                      - generic [ref=e506]:
                        - generic: Collect and dedupe
                        - button "What is a step?"
                      - generic [ref=e507]:
                        - generic: Record the findings
                        - button "What is a step?"
                      - generic [ref=e508]:
                        - generic: Triage on the canvas
                        - button "What is a step?"
                      - generic [ref=e509]:
                        - generic: Re-run the roster
                        - button "What is a step?"
                      - generic [ref=e510]:
                        - button "Findings triaged" [ref=e511]
                        - generic [ref=e515]:
                          - generic: Stakeholders
                          - button "What is a lane?"
                        - generic [ref=e518]:
                          - generic: Blueprint owner
                          - button "What is a lane?"
                        - separator "LINE OF INTERACTION" [ref=e520]:
                          - button "LINE OF INTERACTION" [ref=e522]
                        - generic [ref=e526]:
                          - generic: App & skill surface
                          - button "What is a lane?"
                        - generic [ref=e529]:
                          - generic: Claude in the IDE
                          - button "What is a lane?"
                        - separator "LINE OF VISIBILITY" [ref=e530]:
                          - button "LINE OF VISIBILITY" [ref=e532]
                        - generic [ref=e536]:
                          - generic: Pipeline scripts
                          - button "What is a lane?"
                        - generic [ref=e539]:
                          - generic: Subagent fleet
                          - button "What is a lane?"
                        - generic [ref=e542]:
                          - generic: References & guardrails
                          - button "What is a lane?"
                        - generic [ref=e547]:
                          - generic [ref=e548]:
                            - button
                          - generic [ref=e556]:
                            - button
                          - generic [ref=e558]:
                            - button
                          - generic [ref=e560]:
                            - button
                        - separator [ref=e562]
                        - generic [ref=e566]:
                          - generic [ref=e576]:
                            - button "Findings panel"
                            - button "Severity badges"
                          - generic [ref=e579]:
                            - button "Triage controls (accept / dismiss / resolve)"
                        - generic [ref=e584]:
                          - generic [ref=e585]:
                            - button
                          - generic [ref=e587]:
                            - button
                          - generic [ref=e589]:
                            - button
                          - generic [ref=e591]:
                            - button
                          - generic [ref=e593]:
                            - button
                          - generic [ref=e597]:
                            - button
                        - separator [ref=e598]
                        - generic [ref=e602]:
                          - generic [ref=e606]:
                            - button "audit_tools.py export"
                          - generic [ref=e611]:
                            - button "Fingerprint = check name + sha256 of the sorted cell keys + reason slug"
                          - generic [ref=e614]:
                            - button "findings table"
                            - button "audit/findings-report.json"
                          - generic [ref=e619]:
                            - button "Per-check atomic supersede"
                            - button "One run_id per run"
                        - generic [ref=e622]:
                          - generic [ref=e627]:
                            - button
                          - generic [ref=e629]:
                            - button
                          - generic [ref=e635]:
                            - button
                        - generic [ref=e638]:
                          - generic [ref=e640]:
                            - button "audit-playbook.md"
                          - generic [ref=e645]:
                            - button "check-gap-sweep.md"
                            - button "check-jargon-lint.md"
                            - button "check-channel-conflict.md"
                          - generic [ref=e650]:
                            - button "check-perceived-owner.md"
                            - button "check-value-ledger.md"
                - generic [ref=e657]:
                  - button "Ideate a change (what-if)" [ref=e658]
                  - button "Open Ideate a change (what-if) scenario" [ref=e660]:
                    - generic [ref=e664]:
                      - generic [ref=e665]:
                        - generic: Frame the hypothetical
                        - button "What is a step?"
                      - generic [ref=e666]:
                        - generic: Copy to a variant
                        - button "What is a step?"
                      - generic [ref=e667]:
                        - generic: Trace the graph
                        - button "What is a step?"
                      - generic [ref=e668]:
                        - generic: Judge the consequences
                        - button "What is a step?"
                      - generic [ref=e669]:
                        - generic: Verify every claim
                        - button "What is a step?"
                      - generic [ref=e670]:
                        - generic: Record the comparison
                        - button "What is a step?"
                      - generic [ref=e671]:
                        - generic: Accept or drop it
                        - button "What is a step?"
                      - generic [ref=e672]:
                        - button "Traced before it lands" [ref=e673]
                        - generic [ref=e677]:
                          - generic: Stakeholders
                          - button "What is a lane?"
                        - generic [ref=e680]:
                          - generic: Blueprint owner
                          - button "What is a lane?"
                        - separator "LINE OF INTERACTION" [ref=e682]:
                          - button "LINE OF INTERACTION" [ref=e684]
                        - generic [ref=e688]:
                          - generic: App & skill surface
                          - button "What is a lane?"
                        - generic [ref=e691]:
                          - generic: Claude in the IDE
                          - button "What is a lane?"
                        - separator "LINE OF VISIBILITY" [ref=e692]:
                          - button "LINE OF VISIBILITY" [ref=e694]
                        - generic [ref=e698]:
                          - generic: Pipeline scripts
                          - button "What is a lane?"
                        - generic [ref=e701]:
                          - generic: Subagent fleet
                          - button "What is a lane?"
                        - generic [ref=e704]:
                          - generic: References & guardrails
                          - button "What is a lane?"
                        - generic [ref=e709]:
                          - generic [ref=e710]:
                            - button
                          - generic [ref=e716]:
                            - button
                          - generic [ref=e722]:
                            - button
                        - separator [ref=e724]
                        - generic [ref=e728]:
                          - generic [ref=e734]:
                            - button "Dependency tab"
                            - button "Dependency arrows"
                          - generic [ref=e743]:
                            - button "Nothing on the canvas changes until sb:map promotes an accepted change"
                        - generic [ref=e746]:
                          - generic [ref=e747]:
                            - button
                          - generic [ref=e749]:
                            - button
                          - generic [ref=e751]:
                            - button
                          - generic [ref=e753]:
                            - button
                          - generic [ref=e755]:
                            - button
                          - generic [ref=e757]:
                            - button
                          - generic [ref=e759]:
                            - button
                        - separator [ref=e760]
                        - generic [ref=e764]:
                          - generic [ref=e768]:
                            - button "validate_ir.py on the variant"
                          - generic [ref=e771]:
                            - button "Visited set + depth cap"
                          - generic [ref=e778]:
                            - button "comparison.md"
                            - button "change-request-schema.json"
                          - generic [ref=e781]:
                            - button "Recorded AND recomputed sign-off hashes must both match"
                            - button "or promotion refuses"
                        - generic [ref=e784]:
                          - generic [ref=e789]:
                            - button
                          - generic [ref=e793]:
                            - button
                        - generic [ref=e800]:
                          - generic [ref=e802]:
                            - button "whatif-playbook.md"
                          - generic [ref=e813]:
                            - button "audit-playbook.md §2–§4 — findings mechanics"
                            - button "shared with the audit"
                - generic [ref=e818]:
                  - button "Slice for an audience" [ref=e819]
                  - button "Open Slice for an audience scenario" [ref=e821]:
                    - generic [ref=e825]:
                      - generic [ref=e826]:
                        - generic: Ask for a view
                        - button "What is a step?"
                      - generic [ref=e827]:
                        - generic: Choose the slice type
                        - button "What is a step?"
                      - generic [ref=e828]:
                        - generic: Compose the frames
                        - button "What is a step?"
                      - generic [ref=e829]:
                        - generic: Validate the slice
                        - button "What is a step?"
                      - generic [ref=e830]:
                        - generic: Review the claims
                        - button "What is a step?"
                      - generic [ref=e831]:
                        - generic: Import the slice
                        - button "What is a step?"
                      - generic [ref=e832]:
                        - generic: Present the frames
                        - button "What is a step?"
                      - generic [ref=e833]:
                        - generic: Export to PDF
                        - button "What is a step?"
                      - generic [ref=e834]:
                        - button "Stakeholder readout" [ref=e835]
                        - generic [ref=e839]:
                          - generic: Stakeholders
                          - button "What is a lane?"
                        - generic [ref=e842]:
                          - generic: Blueprint owner
                          - button "What is a lane?"
                        - separator "LINE OF INTERACTION" [ref=e844]:
                          - button "LINE OF INTERACTION" [ref=e846]
                        - generic [ref=e850]:
                          - generic: App & skill surface
                          - button "What is a lane?"
                        - generic [ref=e854]:
                          - generic: Claude in the IDE
                          - button "What is a lane?"
                        - separator "LINE OF VISIBILITY" [ref=e855]:
                          - button "LINE OF VISIBILITY" [ref=e857]
                        - generic [ref=e861]:
                          - generic: Pipeline scripts
                          - button "What is a lane?"
                        - generic [ref=e864]:
                          - generic: Subagent fleet
                          - button "What is a lane?"
                        - generic [ref=e867]:
                          - generic: References & guardrails
                          - button "What is a lane?"
                        - generic [ref=e870]:
                          - generic [ref=e871]:
                            - button
                          - generic [ref=e883]:
                            - button
                          - generic [ref=e885]:
                            - button
                        - generic [ref=e888]:
                          - generic [ref=e889]:
                            - button
                          - generic [ref=e893]:
                            - button
                          - generic [ref=e897]:
                            - button
                          - generic [ref=e901]:
                            - button
                        - separator [ref=e905]
                        - generic [ref=e909]:
                          - generic [ref=e921]:
                            - button "Slices sidebar"
                            - button "Focus view"
                          - generic [ref=e924]:
                            - button "Presentation mode"
                            - button "Filmstrip"
                            - button "Blueprint locator"
                          - generic [ref=e927]:
                            - button "Print / PDF export"
                        - generic [ref=e931]:
                          - generic [ref=e932]:
                            - button
                          - generic [ref=e934]:
                            - button
                          - generic [ref=e936]:
                            - button
                          - generic [ref=e938]:
                            - button
                          - generic [ref=e940]:
                            - button
                          - generic [ref=e942]:
                            - button
                          - generic [ref=e944]:
                            - button
                        - separator [ref=e947]
                        - generic [ref=e951]:
                          - generic [ref=e955]:
                            - button "slice-templates.md"
                          - generic [ref=e958]:
                            - button "slice_tools.py select"
                          - generic [ref=e961]:
                            - button "slice-schema.json"
                          - generic [ref=e966]:
                            - button "slices"
                            - button "slides"
                        - generic [ref=e982]:
                          - button
                        - generic [ref=e991]:
                          - generic [ref=e993]:
                            - button "slice-playbook.md"
                          - generic [ref=e1006]:
                            - button "storyboard-prompts.md — optional imagery"
                            - button "only after the text path is complete"
            - button "Open Maintain phase" [ref=e1009] [cursor=pointer]:
              - button "04 · Maintain" [ref=e1010]
              - generic [ref=e1014]:
                - button "Keep it current" [ref=e1015]
                - button "Open Keep it current scenario" [ref=e1017]:
                  - generic [ref=e1021]:
                    - generic [ref=e1022]:
                      - generic: Notice the drift
                      - button "What is a step?"
                    - generic [ref=e1023]:
                      - generic: Resume the workspace
                      - button "What is a step?"
                    - generic [ref=e1024]:
                      - generic: Edit the scenario
                      - button "What is a step?"
                    - generic [ref=e1025]:
                      - generic: Re-sign
                      - button "What is a step?"
                    - generic [ref=e1026]:
                      - generic: Re-import
                      - button "What is a step?"
                    - generic [ref=e1027]:
                      - button "Update what changed" [ref=e1028]
                      - generic [ref=e1032]:
                        - generic: Stakeholders
                        - button "What is a lane?"
                      - generic [ref=e1036]:
                        - generic: Blueprint owner
                        - button "What is a lane?"
                      - separator "LINE OF INTERACTION" [ref=e1038]:
                        - button "LINE OF INTERACTION" [ref=e1040]
                      - generic [ref=e1044]:
                        - generic: App & skill surface
                        - button "What is a lane?"
                      - generic [ref=e1047]:
                        - generic: Claude in the IDE
                        - button "What is a lane?"
                      - separator "LINE OF VISIBILITY" [ref=e1048]:
                        - button "LINE OF VISIBILITY" [ref=e1050]
                      - generic [ref=e1054]:
                        - generic: Pipeline scripts
                        - button "What is a lane?"
                      - generic [ref=e1057]:
                        - generic: Subagent fleet
                        - button "What is a lane?"
                      - generic [ref=e1060]:
                        - generic: References & guardrails
                        - button "What is a lane?"
                      - generic [ref=e1063]:
                        - generic [ref=e1064]:
                          - button
                        - generic [ref=e1072]:
                          - button
                      - generic [ref=e1076]:
                        - generic [ref=e1077]:
                          - button
                        - generic [ref=e1081]:
                          - button
                        - generic [ref=e1083]:
                          - button
                        - generic [ref=e1085]:
                          - button
                      - separator [ref=e1087]
                      - generic [ref=e1101]:
                        - button "Canvas"
                        - button "redrawn from the re-imported rows"
                      - generic [ref=e1104]:
                        - generic [ref=e1107]:
                          - button
                        - generic [ref=e1109]:
                          - button
                        - generic [ref=e1111]:
                          - button
                        - generic [ref=e1113]:
                          - button
                      - separator [ref=e1114]
                      - generic [ref=e1118]:
                        - generic [ref=e1122]:
                          - button "blueprint-workspace.json"
                          - button "HANDOFF.md"
                        - generic [ref=e1127]:
                          - button "compute_signoff_hash.py"
                        - generic [ref=e1130]:
                          - button "generate_seed_sql.py"
                          - button "generate_fallbacks.py --register"
                      - generic [ref=e1138]:
                        - button
                      - generic [ref=e1145]:
                        - generic [ref=e1149]:
                          - button "workspace-state.md"
                        - generic [ref=e1152]:
                          - button "customization.md — how a workspace is upgraded when the template moves under it"
          - generic:
            - generic:
              - button "Select / pan" [pressed] [ref=e1157] [cursor=pointer]
              - generic [ref=e1158]:
                - button "Pen" [ref=e1159] [cursor=pointer]
                - button "Draw tools" [ref=e1160] [cursor=pointer]
              - generic [ref=e1161]:
                - button "Rectangle" [ref=e1162] [cursor=pointer]
                - button "Shapes tools" [ref=e1163] [cursor=pointer]
              - generic [ref=e1164]:
                - button "Text" [ref=e1165] [cursor=pointer]
                - button "Content tools" [ref=e1166] [cursor=pointer]
              - button "Clear annotations" [disabled]
```

# Test source

```ts
  256 |   }
  257 |   throw new Error(
  258 |     `the board for ${scenarioTitle} never settled within 20s at ${address}: ` +
  259 |       `last reading ${previous || '(no box)'} (box x:y:width:height:filled cells)`,
  260 |   )
  261 | }
  262 | 
  263 | /**
  264 |  * The board rendered content, rather than a spinner, an empty grid or the
  265 |  * boundary.
  266 |  *
  267 |  * Scoped to the addressed scenario's own artboard: the canvas draws every
  268 |  * scenario of the service and navigation moves the camera, so a count taken
  269 |  * over the page would be satisfied by any other board on it.
  270 |  */
  271 | async function expectBoardRendered(page: Page, view: View): Promise<void> {
  272 |   await expect(
  273 |     page.getByText('Something went wrong'),
  274 |     'no error boundary on this board',
  275 |   ).toHaveCount(0)
  276 | 
  277 |   const board = page.locator(`[data-focus-slide-id="${view.scenario.id}"]`)
  278 |   await expect(board, `the board for ${view.scenario.title}`).toBeVisible()
  279 | 
  280 |   // A grid of empty boxes is the shape a broken board takes — the frame is
  281 |   // laid out from the structure and the content is what fails to arrive.
  282 |   const filledCells = await waitForBoardSettled(board, view.scenario.title, boardAddress(view))
  283 |   expect(filledCells, 'the board’s cells carry content').toBeGreaterThan(0)
  284 | 
  285 |   await expect(
  286 |     board.locator('[data-blueprint-column-header]').first(),
  287 |     'the board has step headers',
  288 |   ).toBeVisible()
  289 | 
  290 |   expect(
  291 |     await board.locator('[data-blueprint-cell]').count(),
  292 |     'the board has cells',
  293 |   ).toBeGreaterThan(0)
  294 | 
  295 |   const laneLabels = (await board.locator('[data-blueprint-row-header]').allInnerTexts())
  296 |     .map((text) => text.trim())
  297 |     .filter(Boolean)
  298 |   expect(laneLabels.length, 'the board has lanes, and they are labelled').toBeGreaterThan(0)
  299 | 
  300 |   // The address resolved to the board it named. A scenario id the app cannot
  301 |   // resolve degrades to its phase and then to the overview, which still draws
  302 |   // a grid — so without this a stale id reads as a pass.
  303 |   expect(
  304 |     new URL(page.url()).searchParams.get(PARAM.scenario),
  305 |     'the address still names this scenario',
  306 |   ).toBe(view.scenario.id)
  307 | 
  308 |   // The layout, where the app offers the control. It appears from two
  309 |   // selected paths up — below that there is nothing to lay out two ways.
  310 |   const layoutControl = page.locator('[aria-label="Path display"]')
  311 |   if ((await layoutControl.count()) > 0) {
  312 |     const segment = layoutControl.locator(
  313 |       `[aria-label="${view.layout === 'merged' ? 'Merged' : 'Stacked'}"]`,
  314 |     )
  315 |     await expect(segment, 'the layout the address asked for is the one shown').toHaveAttribute(
  316 |       'aria-pressed',
  317 |       'true',
  318 |     )
  319 |   }
  320 | }
  321 | 
  322 | test.describe('the bundled sample board', () => {
  323 |   test('renders every phase, scenario, path and layout without a console error', async ({
  324 |     page,
  325 |   }) => {
  326 |     mkdirSync(VIEW_SCREENSHOT_DIR, { recursive: true })
  327 | 
  328 |     /**
  329 |      * The guard, watched failing.
  330 |      *
  331 |      * A run that reports no console errors looks identical whether the app is
  332 |      * clean or the listener was never wired up. CI runs this walk twice: once
  333 |      * with this variable set, asserting the exit code is non-zero, and once
  334 |      * for real. See the `render-walk` job in `.github/workflows/ci.yml`.
  335 |      */
  336 |     if (process.env.RENDER_WALK_INJECT_CONSOLE_ERROR) {
  337 |       await page.addInitScript(() => {
  338 |         console.error('render-walk self-test: injected')
  339 |       })
  340 |     }
  341 | 
  342 |     const problems: Problem[] = []
  343 |     let address = '/'
  344 |     page.on('console', (message) => {
  345 |       if (message.type() === 'error') {
  346 |         problems.push({ address, detail: `console.error: ${message.text()}` })
  347 |       }
  348 |     })
  349 |     page.on('pageerror', (error) => {
  350 |       problems.push({ address, detail: `pageerror: ${error.message}` })
  351 |     })
  352 | 
  353 |     const assertNoProblems = () => {
  354 |       if (problems.length === 0) return
  355 |       const lines = problems.map((problem) => `  ${problem.address}\n    ${problem.detail}`)
> 356 |       throw new Error(
      |             ^ Error: 1 browser error while walking the sample board:
  357 |         `${problems.length} browser error${problems.length === 1 ? '' : 's'} while walking the sample board:\n${lines.join('\n')}`,
  358 |       )
  359 |     }
  360 | 
  361 |     address = '/'
  362 |     await page.goto(address)
  363 | 
  364 |     // NO DATABASE, and the app says so. `isSupabaseConfigured()` in
  365 |     // `src/lib/supabase.ts` reads `VITE_SUPABASE_URL` at BUILD time, so a
  366 |     // `.env` holding real values bakes them into `dist` and the preview then
  367 |     // serves somebody's live rows. That walk would be measuring a database's
  368 |     // content, and it would go red or green for reasons nothing in this
  369 |     // repository controls. Build with the variables cleared — see
  370 |     // `render-walk/README.md`.
  371 |     await expect(
  372 |       page.getByText('sample data'),
  373 |       'the preview is in no-database mode, showing the bundled sample board',
  374 |     ).toBeVisible()
  375 | 
  376 |     const phases = await readInventory(page)
  377 |     assertNoProblems()
  378 | 
  379 |     const views: View[] = []
  380 |     for (const phase of phases) {
  381 |       for (const scenario of phase.scenarios) {
  382 |         address = boardAddress({ phase, scenario, layout: 'stacked', pathKeys: [] })
  383 |         await page.goto(address)
  384 |         await expectBoardRendered(page, { phase, scenario, layout: 'stacked', pathKeys: [] })
  385 |         const pathKeys = await readPathKeys(page)
  386 |         assertNoProblems()
  387 | 
  388 |         // Every layout the scenario OFFERS, which is not always two. Stacked
  389 |         // shows one path at a time — that is the layout's whole claim — so it
  390 |         // gets one view per path. Merged shows them together, and below two
  391 |         // paths there is nothing to lay out two ways: the app hides the
  392 |         // control, and a `merged` address for a single-path scenario differs
  393 |         // from its `stacked` one by the `view=` param alone. That pair is one
  394 |         // board walked twice and one screenshot filed twice, so the merged
  395 |         // view is added only from two paths up.
  396 |         const stacked = pathKeys.length > 0 ? pathKeys.map((key) => [key]) : [[]]
  397 |         for (const selection of stacked) {
  398 |           views.push({ phase, scenario, layout: 'stacked', pathKeys: selection })
  399 |         }
  400 |         if (pathKeys.length >= 2) {
  401 |           views.push({ phase, scenario, layout: 'merged', pathKeys })
  402 |         }
  403 |       }
  404 |     }
  405 | 
  406 |     for (const view of views) {
  407 |       address = boardAddress(view)
  408 |       await test.step(`${view.scenario.title} — ${view.layout} — ${address}`, async () => {
  409 |         await page.goto(address)
  410 |         await expectBoardRendered(page, view)
  411 |         await page.screenshot({
  412 |           path: join(VIEW_SCREENSHOT_DIR, `${screenshotName(view)}.png`),
  413 |         })
  414 |         assertNoProblems()
  415 |       })
  416 |     }
  417 | 
  418 |     // Said out loud so the run's log states what it covered. A walk that
  419 |     // silently visited three views reads exactly like one that visited forty.
  420 |     console.log(
  421 |       `render-walk: ${views.length} views over ${phases.length} phases and ` +
  422 |         `${phases.reduce((total, phase) => total + phase.scenarios.length, 0)} scenarios; ` +
  423 |         `screenshots in ${VIEW_SCREENSHOT_DIR}`,
  424 |     )
  425 |   })
  426 | })
  427 | 
```