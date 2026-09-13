/// <reference types="vite/client" />

/**
 * Build-time environment variables used by the checkout flows.
 * Declaring them explicitly keeps `noPropertyAccessFromIndexSignature`
 * enabled while allowing safe dot access through `import.meta.env`.
 */
interface ImportMetaEnv {
  readonly VITE_WHISH_MONEY_ACCOUNT?: string;
  readonly VITE_WHISH_MONEY_ACCOUNT_NAME?: string;
}

/**
 * TypeScript 5.8 models Uint8Array with an ArrayBufferLike backing store,
 * while the DOM Blob constructor is typed more narrowly. The invoice PDF
 * builder only produces ordinary browser Uint8Array chunks, so this
 * compatibility declaration reflects the runtime-supported input without
 * changing the generated PDF code.
 */
interface BlobConstructorCompat {
  readonly prototype: Blob;
  new (
    blobParts?: Array<BlobPart | Uint8Array<ArrayBufferLike>>,
    options?: BlobPropertyBag,
  ): Blob;
}

declare var Blob: BlobConstructorCompat;
