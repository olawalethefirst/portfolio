import Image from "next/image";

export function ContactProfileImage({ src, alt }: { src: string; alt: string }) {
  return <div className="relative mx-auto aspect-square w-full max-w-48 overflow-hidden border border-border">
    <Image src={src} alt={alt} fill sizes="192px" className="object-contain" />
  </div>;
}
