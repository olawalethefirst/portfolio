"use client";

import { ContactConversationForm, type ContactSubmission } from "./ContactConversationForm";
import { ContactCompletion, ContactIntroduction, ContactSection } from "./ContactSection";
import { SocialLinks } from "./SocialLinks";

export type { ContactIntent, ContactSubmission } from "./ContactConversationForm";
export interface ContactConversationSectionProps {
  className?: string;
  id?: string;
  onSubmit?: (submission: ContactSubmission) => Promise<void> | void;
}

export function ContactConversationSection({ className, id, onSubmit }: ContactConversationSectionProps) {
  return <ContactSection className={className} id={id}>
    <ContactIntroduction><SocialLinks /></ContactIntroduction>
    <ContactConversationForm onSubmit={onSubmit}>
      <ContactCompletion>Your response is complete. Any follow-up will use the email you shared.</ContactCompletion>
    </ContactConversationForm>
  </ContactSection>;
}
