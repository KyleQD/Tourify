# Admin Execution Mode

Use this protocol for every Admin completion session.

1. Run `npm run admin:next` to select the first dependency-ready batch below its exit status.
2. Run `npm run admin:context -- --batch ADM-BXX` and read the generated packet, this constitution, the current diff, and only the packet's referenced sources.
3. Confirm the batch's upstream security and data-model gates before writing production paths.
4. Implement one coherent producer-to-recipient slice. Promote each linked task or finding only when its own acceptance criteria and evidence are satisfied.
5. Run `npm run verify:admin:focused -- --batch ADM-BXX`. Full output is written to ignored audit artifacts and only a bounded failure summary is printed.
6. Run `npm run check:admin-audit`. Resolve mapping, hash, generated-view, or evidence drift before closing the slice.
7. Close on an immutable implementation commit and a separate evidence-only commit. Do not treat WIP checkpoints as evidence.

Do not reread the master handoff, both summary chats, every feature specification, or the complete registry during ordinary execution. Those are discovery inputs and are reopened only when a recorded source changes or the current packet cannot resolve a concrete implementation question.
