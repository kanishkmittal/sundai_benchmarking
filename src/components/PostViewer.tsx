import type { FinalPost, PostRecord, ResearchSource } from "../lib/types";

interface PostViewerProps {
  post: Pick<PostRecord, "title" | "subtitle" | "markdown" | "footnotes" | "attributions"> &
    Pick<FinalPost, "createdAt">;
  sources: ResearchSource[];
}

function renderBlocks(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      if (block.startsWith("# ")) {
        return <h1 key={index}>{block.slice(2)}</h1>;
      }
      if (block.startsWith("## ")) {
        return <h2 key={index}>{block.slice(3)}</h2>;
      }
      if (block.startsWith("### ")) {
        return <h3 key={index}>{block.slice(4)}</h3>;
      }
      return <p key={index}>{block}</p>;
    });
}

export function PostViewer({ post, sources }: PostViewerProps) {
  return (
    <article className="post-viewer">
      <header className="post-viewer__header">
        <p className="card__eyebrow">Final post</p>
        <h1>{post.title}</h1>
        <p className="post-viewer__subtitle">{post.subtitle}</p>
        <p className="post-viewer__meta">
          Saved {new Date(post.createdAt).toLocaleString()}
        </p>
      </header>
      <div className="post-viewer__content">{renderBlocks(post.markdown)}</div>
      <section className="post-viewer__footnotes">
        <h2>Footnotes</h2>
        <ol>
          {post.footnotes.map((footnote) => {
            const attribution = post.attributions.find(
              (entry) => entry.citation === footnote.number
            );
            const source = sources.find((entry) => entry.id === footnote.sourceId);
            return (
              <li key={footnote.number}>
                <a href={footnote.url} rel="noreferrer" target="_blank">
                  {footnote.label}
                </a>
                {attribution ? (
                  <span>
                    {" "}
                    by {attribution.author} on {attribution.publicationDate}
                  </span>
                ) : null}
                {source ? <p>{source.snippet}</p> : null}
              </li>
            );
          })}
        </ol>
      </section>
    </article>
  );
}
