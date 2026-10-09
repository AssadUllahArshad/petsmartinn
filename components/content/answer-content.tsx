import type { AEO } from "@/types/content";
import { Schema } from "./schema";
export function AnswerContent({ value }: { value: AEO }) {
  return (
    <>
      {value.directAnswer && (
        <aside className="answer-block">{value.directAnswer}</aside>
      )}
      {value.takeaways?.length ? (
        <section className="prose">
          <h2>Key takeaways</h2>
          <ul>
            {value.takeaways.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {value.whoFor && (
        <p>
          <strong>Who this is for:</strong> {value.whoFor}
        </p>
      )}
      {value.comparisonSummary && <p>{value.comparisonSummary}</p>}
      {value.importantFacts?.length ? (
        <section className="prose">
          <h2>Important facts</h2>
          <ul>
            {value.importantFacts.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {value.faqs?.length ? (
        <section className="prose">
          <h2>Common questions</h2>
          {value.faqs.map((f, i) => (
            <details className="faq" key={i}>
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
          <Schema
            value={{
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: value.faqs.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer },
              })),
            }}
          />
        </section>
      ) : null}
    </>
  );
}
