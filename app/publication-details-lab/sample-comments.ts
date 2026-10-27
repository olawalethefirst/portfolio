import type { CommentThreadData } from "@/src/components/publication-comments/CommentThread";

export const sampleComments: CommentThreadData[] = [
  {
    id: "decision-boundary", name: "Maya Chen", date: "2026-09-20",
    text: "The distinction between *explaining the algorithm* and **showing the decision boundary** really resonates. It gives people something they can actually act on.",
    replies: [
      { id: "boundary-reply", name: "Daniel Okafor", date: "2026-09-21", text: "We saw this in an onboarding flow. Explaining which information was missing helped far more than describing how our scoring worked." },
      { id: "addressed-reply", name: "Maya Chen", date: "2026-09-21", recipient: "Daniel Okafor", text: "Exactly. A clear next step turns an explanation into something useful." },
    ],
  },
  {
    id: "review-path", name: "Alex Morgan", date: "2026-09-22",
    text: "I would love to see more teams treat the review path as part of the original design rather than something added after launch. Thanks for putting this into words.",
    replies: [],
  },
  {
    id: "ownership", name: "Priya Shah", date: "2026-09-23",
    text: "> A trustworthy system makes ownership discoverable.\n\nMaking ownership visible is the part I keep coming back to. Even a good explanation can feel incomplete when nobody knows who can change the outcome.\n\nThe [DEV editor guide](https://dev.to/p/editor_guide/) is another useful reference for keeping authored content predictable.",
    replies: [],
  },
];
