import { faqById, homeTopicActions, SUPPORT_FAQ, SUPPORT_LINKS, WELCOME_TEXT } from "./faq";
import type { ChatMessage, SupportAction, SupportFaqEntry, SupportQuestionId } from "./types";

let seq = 0;
export function nextMessageId(prefix = "m") {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}`;
}

export function welcomeMessage(): ChatMessage {
  return {
    id: nextMessageId("w"),
    role: "bot",
    text: WELCOME_TEXT,
    actions: homeTopicActions(),
  };
}

export function backTopicsMessage(): ChatMessage {
  return {
    id: nextMessageId("b"),
    role: "bot",
    text: "Anything else you need?",
    actions: homeTopicActions(),
  };
}

function followUpActions(entry: SupportFaqEntry): SupportAction[] {
  const fromFollowUps = (entry.followUps || []).map((id) => {
    const child = faqById(id)!;
    return {
      id,
      label: child.label,
      kind: "question" as const,
      questionId: id,
    };
  });
  const explicit = entry.actions || [];
  const seen = new Set<string>();
  const merged: SupportAction[] = [];
  for (const action of [...fromFollowUps, ...explicit]) {
    const href = "href" in action ? action.href || "" : "";
    const questionId = "questionId" in action ? action.questionId || "" : "";
    const key = `${action.kind}:${action.id}:${href}:${questionId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(action);
  }
  return merged;
}

export function faqResponse(questionId: SupportQuestionId): ChatMessage | null {
  const entry = faqById(questionId);
  if (!entry) return null;
  return {
    id: nextMessageId("f"),
    role: "bot",
    text: entry.answer,
    actions: followUpActions(entry),
  };
}

export function userEcho(label: string): ChatMessage {
  return { id: nextMessageId("u"), role: "user", text: label };
}

export function loadingMessage(text = "One moment…"): ChatMessage {
  return { id: nextMessageId("l"), role: "bot", text, loading: true };
}

export function errorMessage(text: string, retry = true): ChatMessage {
  const actions: SupportAction[] = [
    { id: "back_topics", label: "Back to topics", kind: "command", command: "back" },
  ];
  if (retry) {
    actions.unshift({ id: "retry", label: "Try again", kind: "command", command: "retry" });
  }
  return {
    id: nextMessageId("e"),
    role: "bot",
    text,
    error: true,
    actions,
  };
}

export function signInPrompt(returnPath: string): ChatMessage {
  const next = returnPath.startsWith("/") && !returnPath.startsWith("//") ? returnPath : "/shop";
  return {
    id: nextMessageId("s"),
    role: "bot",
    text: "Sign in with a one-time code to see orders on your account. After you sign in, open this chat again to continue.",
    actions: [
      {
        id: "login",
        label: "Sign in",
        kind: "link",
        href: `${SUPPORT_LINKS.login}?next=${encodeURIComponent(next)}`,
        command: "login",
      },
      { id: "back_topics", label: "Back to topics", kind: "command", command: "back" },
    ],
  };
}

export function emptyOrdersMessage(): ChatMessage {
  return {
    id: nextMessageId("o"),
    role: "bot",
    text: "There are no orders on this account yet. Once you place an order, it will show up here.",
    actions: [
      { id: "browse_shop", label: "Browse products", kind: "link", href: SUPPORT_LINKS.shop },
      { id: "back_topics", label: "Back to topics", kind: "command", command: "back" },
    ],
  };
}

/** Every FAQ answer must cite a non-empty policySource (test aid). */
export function faqPolicySources(): { id: SupportQuestionId; policySource: string; answer: string }[] {
  return SUPPORT_FAQ.map((entry) => ({
    id: entry.id,
    policySource: entry.policySource,
    answer: entry.answer,
  }));
}
