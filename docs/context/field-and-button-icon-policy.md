# Field and button icon policy

Consider icons for single-line inputs and non-ghost buttons during planning;
icons are not mandatory. Textareas and ghost buttons are icon-free by default.
Add an icon to these controls only when it provides a clear benefit, such as a
directional cue for Back or an identifiable Reply action. Apply this policy when
creating or revising controls; existing screens are not automatically redesigned.

## Planning and design iteration

For inputs and non-ghost buttons, compare plausible icons from
the existing `lucide-react` library. Usually two candidates are enough. Show the
candidates alongside the actual label and record the recommended icon, its
placement, and a short reason. A visual comparison is useful when meaning or
balance is uncertain; naming candidates in the plan is sufficient otherwise.

Record the selected icon or the reason for omitting it, such as redundant
meaning or visual noise. Textareas and ghost buttons need no opt-out record to
follow their icon-free default; record the benefit when adding an icon instead.
Do not block unrelated implementation waiting for separate approval: use the
planning decision and existing user direction.

## Selection and implementation

- Choose the icon for the control's meaning, rather than decoration. Reuse the
  same icon for the same action or field meaning across the product.
- Prefer a leading icon for field meaning and button actions. Use a trailing
  icon when it clearly communicates direction or an additional action.
- Use existing UI wrappers and library composition. Reserve space so icons do
  not overlap typed text, placeholders, or multiline content.
- Keep visible field labels and text button labels. Decorative icons are hidden
  from assistive technology. Icon-only buttons require an accessible name.
- Interactive field icons, such as clear or show-password actions, are distinct
  keyboard-accessible buttons with their own accessible names.
- Keep icon sizing, stroke weight, alignment, and spacing consistent. Verify
  focus, validation, disabled states, and both color modes when reviewing the UI.

## Planning record example

| Control | Candidates | Decision | Placement / reason |
|---|---|---|---|
| Post comment | Send, MessageSquarePlus | Send | Leading; communicates submission |
| Name | UserRound, Signature | UserRound | Leading; identifies the author field |
| Long-form comment | Not needed | No icon (default) | Preserve a quiet writing area |
| Cancel (ghost) | Not needed | No icon (default) | Text label is sufficient |
| Reply (ghost) | Reply, MessageSquare | Reply (exception) | Leading; clarifies the response action |

These are examples, not preselected decisions for existing forms. Compare the
icons in context during the next design iteration.
