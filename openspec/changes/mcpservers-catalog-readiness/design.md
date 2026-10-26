# Design

## Context

See `proposal.md` for motivation and `specs/server-catalog-readiness/spec.md` for behavior requirements. The project is currently documentation-only and has no running endpoint or source authorization. The mcpservers.org submission form currently exposes fields for server name, category, short description, repository/website/documentation URL, optional official MCP Registry name, remote-connection support, contact email, and a choice between free and paid submission. It does not publish detailed technical acceptance tests on the form.

## Goals / Non-Goals

**Goals:**

- Convert the observed submission fields into a maintainable project listing record.
- Establish verifiable readiness checks for a future remote endpoint and public documentation.
- Keep listing preparation separate from submitting the live form; submission requires the maintainer's contact email and final review.
- Preserve the source authorization gate for all 104 and Cake data access.

**Non-Goals:**

- Submit to mcpservers.org, create an account, provide a contact email, or pay for promoted review.
- Claim acceptance, endorsement, verification, or official status from mcpservers.org.
- Treat a directory listing as approval by 104, Cake, ChatGPT, Claude, or the official MCP Registry.
- Build or deploy the MCP server in this change.

## Decisions

### 1. Keep a listing metadata record in the repository

Maintain a checklist with the exact public submission fields and values/statuses. Include one-line description and category as editorial fields that require human review. The category must be selected from the form's available choices when submitting; do not invent an internal category identifier. Store contact email only after the maintainer selects an operational address. The optional Official MCP Registry name remains blank until a listing exists there.

**Alternative considered:** Put all submission content only in a private note or submit directly from the form. Rejected because the project needs a reviewable source of truth and a reproducible release checklist.

### 2. Separate directory requirements from project readiness recommendations

The checklist labels each item as either a field explicitly present on the mcpservers.org form or a project-level readiness control. The form explicitly asks whether remote connection is supported, but does not state a required transport, endpoint testing policy, privacy policy, or compatibility matrix. The project will require public HTTPS remote MCP, documented transport/authentication, endpoint handshake validation, privacy/data-use information, and source authorization before claiming readiness; these are responsible launch controls, not claims about the directory's formal review rubric.

**Alternative considered:** Describe every control as a directory mandate. Rejected because the form does not document such a rubric, and doing so would misrepresent the source.

### 3. Use the free submission path first

Plan for the listed free submission path and review window. The page currently advertises an optional one-time paid submission with expedited review and promotion; price and benefits can change, so confirm them at submission time. No payment is authorized by this change.

**Alternative considered:** Budget for the paid path by default. Rejected because expedited review and promotion are not required for technical readiness, and the maintainer has not approved a spend.

### 4. Gate publication on source authorization and production readiness

Do not mark the project ready or claim that 104/Cake are supported until authorization scope and a working adapter are verified. A publicly reachable endpoint alone does not establish permission to provide third-party job data. Use synthetic or specifically authorized fixtures until that gate is satisfied.

**Alternative considered:** Publish a listing with one or both sources marked as planned. Rejected for the initial public listing because the product's core job-search promise would otherwise be misleading; any future partial listing must describe disabled sources explicitly and be reviewed against the directory's current submission rules.

## Risks / Trade-offs

- [The directory form or review process changes] → Re-check the live form immediately before submission and update the metadata record.
- [The project has no public endpoint, repository, website, or support email yet] → Track these as unresolved release prerequisites; do not invent placeholder contact details or claim remote support.
- [A listing is mistaken for provider endorsement or platform authorization] → State clearly in public docs that directory inclusion is third-party discovery only and does not imply endorsement or data-source permission.
- [Source authorization or client data-transfer scope remains unresolved] → Keep the source disabled and block publication of claims that it is supported.
- [The contact email becomes unattended] → Use a maintained support address and assign an owner before submission.

## Migration Plan

1. Add the directory checklist to project documentation and keep unresolved fields visibly marked as pending.
2. After source authorization and implementation, publish the repository/docs and deploy the remote endpoint.
3. Verify public links, endpoint reachability, MCP handshake, authentication instructions, tool descriptions, source attribution, and privacy/data-flow documentation.
4. Have the maintainer review every submission field and choose the free or paid option at that time.
5. Submit only after all required fields are accurate; record the submission date, selected category, contact owner, and listing URL after approval.

**Rollback:** If a listing is inaccurate or the endpoint is unavailable, correct or remove the directory entry and disable the affected source/endpoint as appropriate. Do not continue advertising remote availability during an outage.

## Open Questions

- Which maintained support email should be public?
- What category names are available in the live form when submission occurs?
- Will the project have an official MCP Registry identifier before directory submission?
- What public repository, documentation site, and production MCP endpoint will be used?
