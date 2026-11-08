"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button";

const maxBytes = 10 * 1024 * 1024;

/** Local demo images use data URLs so saved previews outlive the picker. */
export function ImagePicker({ value, alt, onChange, error, name = "coverSrc" }: {
  value: string;
  alt: string;
  onChange: (source: string) => void;
  error?: string;
  name?: string;
}) {
  const id = useId();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [fileError, setFileError] = useState("");
  const reader = useRef<FileReader | null>(null);
  const generation = useRef(0);
  const change = useRef(onChange);
  useEffect(() => { change.current = onChange; }, [onChange]);
  useEffect(() => () => {
    generation.current += 1;
    reader.current?.abort();
  }, []);

  function select(file: File | undefined) {
    if (!file) return;
    const current = ++generation.current;
    reader.current?.abort();
    setPending(false);
    setFeedback("");
    setFileError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFileError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > maxBytes) {
      setFileError("Choose an image no larger than 10 MiB.");
      return;
    }
    setPending(true);
    const next = new FileReader();
    reader.current = next;
    function fail() {
      if (current !== generation.current) return;
      setPending(false);
      setFileError("This image could not be read. Try another file. Your previous image is unchanged.");
    }
    next.onerror = fail;
    next.onload = async () => {
      if (current !== generation.current) return;
      const source = next.result;
      if (typeof source !== "string") { fail(); return; }
      const image = new window.Image();
      image.src = source;
      try {
        await image.decode();
        if (current !== generation.current) return;
        change.current(source);
        setPending(false);
        setFeedback(`${file.name} selected for this demo.`);
      } catch { fail(); }
    };
    next.readAsDataURL(file);
  }

  return <div className="space-y-3">
    {value ? <div className="relative aspect-[16/10] overflow-hidden border border-border">
      <Image src={value} alt={alt} fill sizes="(max-width: 1279px) 80vw, 288px" className="object-cover" />
    </div> : <p className="border border-dashed border-border p-6 text-sm text-muted">No image selected</p>}
    <label htmlFor={id} className="block text-sm font-medium">{value ? "Replace image" : "Choose image"}</label>
    <input id={id} name={name} type="file" accept="image/jpeg,image/png,image/webp"
      aria-invalid={Boolean(fileError || error)} aria-describedby={`${id}-hint ${id}-error`}
      className="block min-h-11 w-full min-w-0 text-sm file:mr-3 file:border-0 file:bg-default file:px-3 file:py-3 file:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
      onChange={(event) => { select(event.target.files?.[0]); event.target.value = ""; }} />
    <p id={`${id}-hint`} className="text-xs text-muted">JPEG, PNG or WebP · up to 10 MiB. Local preview only.</p>
    <p role="status" className="text-xs text-muted">{pending ? "Reading image…" : feedback}</p>
    <p id={`${id}-error`} role={fileError || error ? "alert" : undefined} className="text-sm text-danger">{fileError || error}</p>
    {value ? <Button variant="ghost" size="sm" onPress={() => {
      generation.current += 1;
      reader.current?.abort();
      setPending(false);
      setFileError("");
      setFeedback("Image removed.");
      onChange("");
    }}>Remove image</Button> : null}
  </div>;
}
