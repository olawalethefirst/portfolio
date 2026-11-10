"use client";

import {
  Description,
  FieldError,
  Form,
  Label,
  Radio,
  RadioGroup,
  TextField,
} from "@heroui/react";
import { ArrowLeft, ArrowRight, SendHorizontal } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
  type ReactNode,
} from "react";

import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { TextArea } from "@/src/components/ui/TextArea";
import { Progress } from "@/src/components/ui/Progress";


export type ContactIntent = "hire" | "collaborate" | "contact";

export interface ContactSubmission {
  intent: ContactIntent;
  goal: string;
  name: string;
  email: string;
}

export interface ContactConversationFormProps {
  onSubmit?: (submission: ContactSubmission) => Promise<void> | void;
  children?: ReactNode;
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
        <TextArea className="mt-2 h-40" maxLength={2000} ref={goalRef} />
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
            className="mt-2"
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
            className="mt-2"
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

export function ContactConversationForm({ onSubmit, children }: ContactConversationFormProps) {
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

  useEffect(() => {
    if (errors.goal) goalRef.current?.focus();
  }, [errors]);

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
      await onSubmit?.({
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
    <>
        {submittedName ? (
          <div
            className="flex w-full flex-col lg:col-start-2 lg:self-end"
            role="status"
          >
            <h3
              className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
              ref={questionRef}
              tabIndex={-1}
            >
              Thanks, {submittedName}.
            </h3>
            {children}
            <Button className="mt-8 self-end" onPress={reset} variant="outline">
              Submit another
            </Button>
          </div>
        ) : (
          <Form
            aria-labelledby={questionId}
            className="flex w-full flex-col lg:col-start-2 lg:self-end"
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
                <Button
                  isDisabled={isSubmitting}
                  onPress={goBack}
                  startContent={<ArrowLeft aria-hidden="true" className="size-4 shrink-0" />}
                  variant="ghost"
                >
                  Back
                </Button>
              ) : (
                <span />
              )}
              <Button
                className="w-32 shrink-0"
                endContent={step === 2 ? (
                  <SendHorizontal aria-hidden="true" className="size-4 shrink-0" />
                ) : (
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                )}
                isDisabled={isSubmitting}
                isLoading={isSubmitting}
                type="submit"
              >
                {step === 2 ? "Send" : "Continue"}
              </Button>
            </div>
          </Form>
        )}
    </>
  );
}
