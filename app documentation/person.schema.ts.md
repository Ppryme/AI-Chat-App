# person.schema.ts

## Purpose of the File
`person.schema.ts` defines a sample structured data schema and inferred TypeScript type used by the `/api/chat/structured` endpoint. It demonstrates model-constrained structured JSON output generation conforming to a specific object blueprint.

---

## Line-by-Line Code Breakdown

- **L1**: Imports `z` from `zod`.
- **L3–L7**: Exports `PersonSchema` defining an object with:
  - `name`: string representing the individual's name.
  - `age`: number representing age in years.
  - `city`: string representing city of residence.
- **L9**: Exports `Person` TypeScript type inferred from `PersonSchema` using `z.infer`.
