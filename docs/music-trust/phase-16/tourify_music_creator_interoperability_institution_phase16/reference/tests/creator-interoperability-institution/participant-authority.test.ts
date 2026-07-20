import { describe, expect, it } from 'vitest'; import { authorizeParticipantAction } from '../../lib/music/creator-interoperability-institution/participant-authority';
describe('authority',()=>{it('denies missing authority',()=>{expect(authorizeParticipantAction({authority:null,requiredScope:'vote',now:'2026-07-18'}).allowed).toBe(false);});});
