"use client";

import { Modal } from "@heroui/react/modal";
import type { ReactNode } from "react";

export function CmsDialog({
  open,
  onClose,
  title,
  children,
  actions,
  error,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions: ReactNode;
  error?: string;
}) {
  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Modal.Container>
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="text-sm leading-6 text-muted">
            {children}
            {error ? <p role="alert" className="mt-3 text-danger">{error}</p> : null}
          </Modal.Body>
          <Modal.Footer className="flex flex-wrap gap-2">
            {actions}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
