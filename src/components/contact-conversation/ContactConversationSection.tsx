"use client";

import {
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Link,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
} from "@heroui/react";
import { siGithub, siX, type SimpleIcon } from "simple-icons";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";

import { Button } from "@/src/components/ui/Button";
import { Progress } from "@/src/components/ui/Progress";
import { cn } from "@/src/components/ui/utils";

export type ContactIntent = "hire" | "collaborate" | "contact";

export interface ContactSubmission {
  intent: ContactIntent;
  goal: string;
  name: string;
  email: string;
}

export interface ContactConversationSectionProps {
  className?: string;
  id?: string;
  onSubmit: (submission: ContactSubmission) => Promise<void> | void;
}

const intentOptions: ReadonlyArray<{
  description: string;
  value: ContactIntent;
  label: string;
}> = [
  {
    description: "Discuss a project or long-term opportunity.",
    value: "hire",
    label: "Hire",
  },
  {
    description: "Create or explore something together.",
    value: "collaborate",
    label: "Collaborate",
  },
  {
    description: "Ask a question or start a conversation.",
    value: "contact",
    label: "Contact",
  },
];

const intentContentClassName =
  "group flex w-full items-start gap-3 rounded-xl border border-border bg-surface/80 px-4 py-3 text-left transition-colors data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-focus/35 data-[hovered=true]:bg-surface-secondary data-[selected=true]:border-accent/40 data-[selected=true]:bg-accent/10 data-[selected=true]:data-[hovered=true]:bg-accent/15";

const intentControlClassName =
  "mt-0.5 size-5 shrink-0 rounded-full border border-border bg-default shadow-none group-data-[pressed=true]:scale-95 group-data-[selected=true]:border-transparent group-data-[selected=true]:bg-accent";

const intentIndicatorClassName =
  "before:rounded-full before:bg-default group-data-[selected=true]:before:scale-50 group-data-[selected=true]:before:bg-accent-foreground group-data-[selected=true]:group-data-[pressed=true]:before:scale-[0.57]";

const goalHelpers: Record<ContactIntent, string> = {
  hire: "Tell me about the project, role, or outcome.",
  collaborate: "Tell me what we could create or explore together.",
  contact: "Tell me what you’d like help with.",
};

const socialProfiles: ReadonlyArray<{
  href: string;
  icon: SimpleIcon | "linkedin";
  label: string;
}> = [
  {
    href: "https://github.com/olawalethefirst",
    icon: siGithub,
    label: "GitHub",
  },
  {
    href: "https://www.linkedin.com/in/olawalethefirst",
    icon: "linkedin",
    label: "LinkedIn",
  },
  {
    href: "https://x.com/olawalethefirst",
    icon: siX,
    label: "X",
  },
];

const fieldClassName =
  "w-full rounded-xl border border-field-border bg-field-background px-4 py-3 text-base text-field-foreground outline-none transition-colors placeholder:text-field-placeholder focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/35";

type Step = 0 | 1 | 2;
type FieldErrors = Partial<
  Record<"intent" | "goal" | "name" | "email" | "submit", string>
>;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

interface StepHeadingProps {
  children: string;
  id: string;
  questionRef: RefObject<HTMLHeadingElement | null>;
}

function StepHeading({ children, id, questionRef }: StepHeadingProps) {
  return (
    <h3
      className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
      id={id}
      ref={questionRef}
      tabIndex={-1}
    >
      {children}
    </h3>
  );
}

function SimpleIconMark({ icon }: { icon: SimpleIcon }) {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path d={icon.path} fill="currentColor" />
    </svg>
  );
}

function LinkedInMark() {
  return (
    <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24">
      <path
        d="M22.2 0H1.8C.8 0 0 .8 0 1.7v20.5c0 1 .8 1.7 1.8 1.7h20.5c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0Z"
        fill="#0077B5"
      />
      <path
        d="M3.6 9h3.6v11.5H3.6V9ZM5.3 3.3c1.1 0 2.1.9 2.1 2.1s-.9 2.1-2.1 2.1c-1.1 0-2.1-.9-2.1-2.1s.9-2.1 2-2.1ZM9.4 9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.3h-3.6V15c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.7H9.4V9Z"
        fill="#FFF"
      />
    </svg>
  );
}

function SocialLinks() {
  return (
    <nav aria-label="Social links" className="flex items-center gap-3">
      {socialProfiles.map(({ href, icon, label }) => (
        <Link
          aria-label={`Visit ${label} profile (opens in a new tab)`}
          className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface/80 text-foreground transition-colors data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-focus/35 data-[hovered=true]:bg-surface-secondary"
          href={href}
          key={label}
          rel="noopener noreferrer"
          target="_blank"
        >
          {icon === "linkedin" ? (
            <LinkedInMark />
          ) : (
            <SimpleIconMark icon={icon} />
          )}
        </Link>
      ))}
    </nav>
  );
}

interface IntentStepProps {
  error?: string;
  intent: ContactIntent | null;
  intentGroupRef: RefObject<HTMLDivElement | null>;
  onChange: (intent: ContactIntent) => void;
  questionId: string;
  questionRef: RefObject<HTMLHeadingElement | null>;
}

function IntentStep({
  error,
  intent,
  intentGroupRef,
  onChange,
  questionId,
  questionRef,
}: IntentStepProps) {
  return (
    <div>
      <StepHeading id={questionId} questionRef={questionRef}>
        How would you like to connect?
      </StepHeading>
      <p className="mt-3 leading-7 text-muted">
        Choose the path that feels closest. We can refine it together.
      </p>

      <RadioGroup
        aria-labelledby={questionId}
        className="mt-8 w-full gap-3 **:data-[slot=radio]:mt-0"
        isInvalid={Boolean(error)}
        name="contact-intent"
        onChange={(value) => onChange(value as ContactIntent)}
        ref={intentGroupRef}
        value={intent ?? ""}
        variant="secondary"
      >
        {intentOptions.map((option) => (
          <Radio key={option.value} value={option.value}>
            <Radio.Content className={intentContentClassName}>
              <Radio.Control className={intentControlClassName}>
                <Radio.Indicator className={intentIndicatorClassName} />
              </Radio.Control>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-foreground">
                  {option.label}
                </span>
                <Description className="text-sm text-muted">
                  {option.description}
                </Description>
              </div>
            </Radio.Content>
          </Radio>
        ))}
        {error ? (
          <FieldError className="mt-3 text-sm font-medium text-danger">
            {error}
          </FieldError>
        ) : null}
      </RadioGroup>
    </div>
  );
}

interface GoalStepProps {
  error?: string;
  goal: string;
  goalRef: RefObject<HTMLTextAreaElement | null>;
  helper: string;
  onChange: (goal: string) => void;
  questionId: string;
  questionRef: RefObject<HTMLHeadingElement | null>;
}

function GoalStep({
  error,
  goal,
  goalRef,
  helper,
  onChange,
  questionId,
  questionRef,
}: GoalStepProps) {
  return (
    <div>
      <StepHeading id={questionId} questionRef={questionRef}>
        What would you like to make happen?
      </StepHeading>
      <p className="mt-3 leading-7 text-muted">{helper}</p>
      <TextField
        className="mt-8"
        fullWidth
        isInvalid={Boolean(error)}
        name="goal"
        onChange={onChange}
        value={goal}
        variant="secondary"
      >
        <Label className="text-sm font-medium">Your goal</Label>
        <TextArea
          className={cn(fieldClassName, "mt-2 min-h-40 resize-y")}
          maxLength={2000}
          ref={goalRef}
        />
        {error ? (
          <FieldError className="mt-3 text-sm font-medium text-danger">
            {error}
          </FieldError>
        ) : null}
      </TextField>
    </div>
  );
}

interface ContactStepProps {
  email: string;
  emailError?: string;
  emailRef: RefObject<HTMLInputElement | null>;
  name: string;
  nameError?: string;
  nameRef: RefObject<HTMLInputElement | null>;
  onEmailChange: (email: string) => void;
  onNameChange: (name: string) => void;
  questionId: string;
  questionRef: RefObject<HTMLHeadingElement | null>;
  submitError?: string;
}

function ContactStep({
  email,
  emailError,
  emailRef,
  name,
  nameError,
  nameRef,
  onEmailChange,
  onNameChange,
  questionId,
  questionRef,
  submitError,
}: ContactStepProps) {
  return (
    <div>
      <StepHeading id={questionId} questionRef={questionRef}>
        How can I reach you?
      </StepHeading>
      <p className="mt-3 leading-7 text-muted">
        Share the name and email you’d like me to reply to.
      </p>

      <div className="mt-8 grid gap-6">
        <TextField
          fullWidth
          isInvalid={Boolean(nameError)}
          name="name"
          onChange={onNameChange}
          value={name}
          variant="secondary"
        >
          <Label className="text-sm font-medium">Name</Label>
          <Input
            autoComplete="name"
            className={cn(fieldClassName, "mt-2")}
            maxLength={100}
            ref={nameRef}
          />
          {nameError ? (
            <FieldError className="mt-2 text-sm font-medium text-danger">
              {nameError}
            </FieldError>
          ) : null}
        </TextField>

        <TextField
          fullWidth
          isInvalid={Boolean(emailError)}
          name="email"
          onChange={onEmailChange}
          type="email"
          value={email}
          variant="secondary"
        >
          <Label className="text-sm font-medium">Email</Label>
          <Input
            autoComplete="email"
            className={cn(fieldClassName, "mt-2")}
            inputMode="email"
            maxLength={254}
            ref={emailRef}
            type="email"
          />
          {emailError ? (
            <FieldError className="mt-2 text-sm font-medium text-danger">
              {emailError}
            </FieldError>
          ) : null}
        </TextField>
      </div>

      {submitError ? (
        <p className="mt-4 text-sm font-medium text-danger" role="alert">
          {submitError}
        </p>
      ) : null}
    </div>
  );
}

export function ContactConversationSection({
  className,
  id = "contact",
  onSubmit,
}: ContactConversationSectionProps) {
  const questionId = useId();
  const questionRef = useRef<HTMLHeadingElement>(null);
  const intentGroupRef = useRef<HTMLDivElement>(null);
  const goalRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const previousStepRef = useRef<Step>(0);
  const [step, setStep] = useState<Step>(0);
  const [intent, setIntent] = useState<ContactIntent | null>(null);
  const [goal, setGoal] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedName, setSubmittedName] = useState<string | null>(null);

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    questionRef.current?.focus({ preventScroll: true });
  }, [step]);

  function goBack() {
    setErrors({});
    setStep((current) => (current === 2 ? 1 : 0));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step === 0) {
      if (!intent) {
        setErrors({ intent: "Choose how you’d like to connect." });
        intentGroupRef.current
          ?.querySelector<HTMLInputElement>('input[type="radio"]')
          ?.focus();
        return;
      }
      setErrors({});
      setStep(1);
      return;
    }

    const normalizedGoal = goal.trim();
    if (step === 1) {
      if (normalizedGoal.length < 10) {
        setErrors({
          goal: "Share at least 10 characters so I have some context.",
        });
        goalRef.current?.focus();
        return;
      }
      setErrors({});
      setStep(2);
      return;
    }

    if (isSubmitting || !intent) return;

    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const nextErrors: FieldErrors = {};

    if (!normalizedName) nextErrors.name = "Enter your name.";
    if (!normalizedEmail) {
      nextErrors.email = "Enter your email address.";
    } else if (!isValidEmail(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      (nextErrors.name ? nameRef.current : emailRef.current)?.focus();
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await onSubmit({
        email: normalizedEmail,
        goal: normalizedGoal,
        intent,
        name: normalizedName,
      });
      setSubmittedName(normalizedName);
    } catch {
      setErrors({
        submit: "I couldn’t send your inquiry. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function reset() {
    setStep(0);
    setIntent(null);
    setGoal("");
    setName("");
    setEmail("");
    setErrors({});
    setSubmittedName(null);
  }

  return (
    <section
      className={cn(
        "relative left-1/2 isolate flex min-h-dvh w-dvw -translate-x-1/2 items-center overflow-hidden bg-background",
        className,
      )}
      id={id}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 text-accent opacity-20"
      >
        <svg
          className="absolute inset-0 size-full [mask-image:linear-gradient(to_top,black_0%,rgb(0_0_0/0.7)_18%,transparent_30%)]"
          fill="none"
          preserveAspectRatio="xMidYMax slice"
          viewBox="0 0 1600 900"
        >
          <g opacity="0.65" stroke="currentColor" strokeWidth="1.5">
            <path d="M0 615H1600" />
            <path d="M0 635H1600M0 662H1600M0 700H1600M0 755H1600M0 835H1600" />
            <path d="M800 615L-240 900M800 615L100 900M800 615L430 900M800 615L670 900M800 615L930 900M800 615L1170 900M800 615L1500 900M800 615L1840 900" />
          </g>
        </svg>
      </div>

      <div className="mx-auto grid min-h-dvh w-full max-w-6xl content-center gap-16 px-5 py-12 pb-32 sm:px-8 lg:h-[min(100dvh,56rem)] lg:min-h-0 lg:grid-cols-2 lg:content-normal lg:py-16 lg:pb-32">
        <div className="flex flex-col items-center gap-6 lg:items-start lg:justify-between">
          <h2 className="max-w-md text-center text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-left">
            Let’s make something happen.
          </h2>
          <SocialLinks />
        </div>

        {submittedName ? (
          <div
            className="mx-auto flex w-full max-w-xl flex-col lg:col-start-2 lg:mx-0 lg:self-end"
            role="status"
          >
            <h3
              className="text-balance text-3xl text-center font-semibold tracking-tight sm:text-4xl"
              ref={questionRef}
              tabIndex={-1}
            >
              Thanks, {submittedName}.
            </h3>
            <p className="mt-4 max-w-lg text-center leading-7 text-muted">
              Your response is complete. Any follow-up will use the email you
              shared.
            </p>
            <Button className="mt-8 mx-auto self-start" onPress={reset} variant="secondary">
              Submit another
            </Button>
          </div>
        ) : (
          <Form
            aria-labelledby={questionId}
            className="mx-auto flex w-full max-w-xl flex-col lg:col-start-2 lg:mx-0 lg:self-end"
            onSubmit={handleSubmit}
            validationBehavior="aria"
          >
            <div className="mb-8 space-y-3">
              <Progress
                aria-label="Contact progress"
                maxValue={3}
                size="xs"
                value={step + 1}
                valueLabel={`Step ${step + 1} of 3`}
              />
            </div>

            {step === 0 ? (
              <IntentStep
                error={errors.intent}
                intent={intent}
                intentGroupRef={intentGroupRef}
                onChange={(nextIntent) => {
                  setIntent(nextIntent);
                  setErrors({});
                }}
                questionId={questionId}
                questionRef={questionRef}
              />
            ) : step === 1 ? (
              intent ? (
                <GoalStep
                  error={errors.goal}
                  goal={goal}
                  goalRef={goalRef}
                  helper={goalHelpers[intent]}
                  onChange={(nextGoal) => {
                    setGoal(nextGoal);
                    setErrors({});
                  }}
                  questionId={questionId}
                  questionRef={questionRef}
                />
              ) : null
            ) : (
              <ContactStep
                email={email}
                emailError={errors.email}
                emailRef={emailRef}
                name={name}
                nameError={errors.name}
                nameRef={nameRef}
                onEmailChange={(nextEmail) => {
                  setEmail(nextEmail);
                  setErrors((current) => ({
                    ...current,
                    email: undefined,
                    submit: undefined,
                  }));
                }}
                onNameChange={(nextName) => {
                  setName(nextName);
                  setErrors((current) => ({
                    ...current,
                    name: undefined,
                    submit: undefined,
                  }));
                }}
                questionId={questionId}
                questionRef={questionRef}
                submitError={errors.submit}
              />
            )}

            <div className="mt-8 flex min-h-10 items-center justify-between gap-4">
              {step > 0 ? (
                <Button isDisabled={isSubmitting} onPress={goBack} variant="ghost">
                  Back
                </Button>
              ) : (
                <span />
              )}
              <Button
                isDisabled={isSubmitting}
                isLoading={isSubmitting}
                type="submit"
              >
                {step === 2 ? "Send inquiry" : "Continue"}
              </Button>
            </div>
          </Form>
        )}
      </div>
    </section>
  );
}
