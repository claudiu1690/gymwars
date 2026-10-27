import { signaturePlanFits } from "../signatureChoices.mjs";
const marks = {
  "clean-combinations": (
    <>
      <path d="M16 29v-9a4 4 0 0 1 8 0v-5a4 4 0 0 1 8 0v-2a4 4 0 0 1 8 0v5a4 4 0 0 1 8 0v17c0 8-5 14-13 14h-6c-6 0-9-4-12-9l-6-9a4 4 0 0 1 6-5l7 7" />
      <path d="M24 20v9m8-14v13m8-10v11M22 49v8h21v-9M9 14l-4-4m45 2 5-5M49 28h7" />
    </>
  ),
  "chain-wrestling": (
    <>
      <path d="m23 17 4-4a13 13 0 0 1 18 18l-7 7a13 13 0 0 1-18 0m21 9-4 4a13 13 0 0 1-18-18l7-7a13 13 0 0 1 18 0M23 41l18-18" />
      <path d="m9 9 5 5m36 36 5 5" />
    </>
  ),
  "escape-artist": (
    <>
      <path d="M32 6 52 14v15c0 14-20 27-20 27S12 43 12 29V14Z" />
      <path d="m23 24 6 6-6 6m11-12 6 6-6 6M18 30h5m17 0h7" />
    </>
  ),
  "pace-keeper": (
    <>
      <path d="M12 49a25 25 0 1 1 40 0Z" />
      <path d="M32 13v6M15 21l4 4m30-4-4 4M10 36h6m32 0h6M32 37l9-12" />
      <circle cx="32" cy="37" r="5" />
    </>
  ),
};

export function SignatureEmblem({ id = "clean-combinations" }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {marks[id] || marks["clean-combinations"]}
    </svg>
  );
}

export function signatureFits(id, plan, combatVersion) {
  return signaturePlanFits(id, plan, combatVersion);
}
