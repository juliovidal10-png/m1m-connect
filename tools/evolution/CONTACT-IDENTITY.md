# TF3 — Evolution contact identity compatibility

This image keeps Evolution 2.3.7 and Baileys 7.0.0-rc.9 at the already verified base digest. It reapplies the existing status ACK correction. No session deletion, QR reset, database migration, contact merge or application deployment is performed by the build.

## Proven scope and limitation

The panel and Evolution both stored the controlled new outgoing message with only `key.id`, `key.fromMe`, and `key.remoteJid` (LID). The current instance hash was found, but the diagnostic did not confirm reciprocal mappings for the nine sampled LIDs. Older diagnostics had two errors: the wrong Redis namespace and an over-parsing decoder; they must not be used as evidence that mappings are missing.

Baileys history contacts carry `id`, `lid`, and `phoneNumber`. Evolution's history handler projects them to `{id,name}` and contact persistence drops the extra identifiers. Baileys already has a native PN-to-LID USync lookup. The compatibility patch preserves explicit history pairs and makes a bounded opt-in identity request available through the existing authenticated, instance-scoped Baileys adapter. This is not a claim that every old contact can be recovered.

## Opt-in adapter contract

Existing string-based onWhatsApp calls are unchanged. The existing Evolution route accepts this explicit body:

```json
{
  "jid": {
    "m1mIdentityLookup": {
      "version": 1,
      "phones": ["5511999990001@s.whatsapp.net"],
      "lids": ["100000000001@lid"]
    }
  }
}
```

POST `/baileys/onWhatsapp/{instanceName}` with the existing authorized API key. Maximum 20 phone JIDs and 100 LIDs; no names, raw numeric internal IDs or extra request fields. Phone candidates must come from available contact data or explicit owner-provided evidence. Native Baileys lookup may update its own per-instance mapping cache with WhatsApp-confirmed responses, but does not send messages or change panel records.

The response has `m1mIdentityLookup: 1`, explicit `mappings: [{lid,pn}]` and `unresolvedLids`. The caller must compare returned LIDs to the actual affected records. A matching name, a valid phone or an `exists` response alone does not establish the association. Conflicting pairs are not returned as confirmed. A missing mapping must remain unresolved.

History capture uses explicit pairs only, rejects contradictions and group/channel participants, and never overwrites an existing `remoteJidAlt`. It adds proven alternate identifiers to history events before Evolution's projection. Existing persisted historical rows are not rewritten; previously discarded metadata cannot be reconstructed from a LID alone.

## Build and validation

Build `tools/evolution/Dockerfile.identity` using the pinned default base. Proposed image tag: `m1m-evolution:2.3.7-status-ack-identity-r2`. Both status ACK and identity tests run inside the image build, together with JavaScript syntax and patch-presence checks. Unsupported versions or source layouts stop the build. Tests use mock repositories and the exact Baileys source files; they do not establish live WhatsApp recovery.

After a successful build, the owner manually changes only the Evolution API image tag in Coolify and keeps `pull_policy: never`, existing environment and persistent storage. Do not change the panel image or reset sessions. A live probe using the owner's already-provided Jeff phone candidate(s) must show a matching affected LID before any panel data correction or automated discovery is proposed. This probe is the next stage, not part of the image build. No promise of recovering the other unknown contacts is made before real evidence exists.

Rollback: restore the previous `m1m-evolution:2.3.7-status-ack-r1` tag through the same manual Coolify deployment, retaining storage. The image does not change the database schema.

TF3 remains active. TF4 and TF5 are not started.

Próxima TF: [adicionar quando surgir]
