import { useId, useRef, useState } from "react";

import type { AttachmentRecord, RichInputValue } from "../lib/types";

interface RichInputProps {
  label: string;
  value: RichInputValue;
  onChange: (value: RichInputValue) => void;
  placeholder?: string;
  testId?: string;
}

function createAttachment(file: File, content: string): AttachmentRecord {
  return {
    id: `${file.name}-${file.lastModified}`,
    name: file.name,
    mimeType: file.type || "text/plain",
    content
  };
}

export function RichInput({
  label,
  value,
  onChange,
  placeholder,
  testId
}: RichInputProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [linkDraft, setLinkDraft] = useState("");

  return (
    <div className="rich-input">
      <label className="rich-input__label" htmlFor={inputId}>
        {label}
      </label>
      <textarea
        id={inputId}
        className="rich-input__textarea"
        data-testid={testId}
        placeholder={placeholder}
        value={value.text}
        onChange={(event) =>
          onChange({
            ...value,
            text: event.target.value
          })
        }
      />
      <div className="rich-input__toolbar">
        <button
          className="button button--secondary"
          type="button"
          onClick={() => fileRef.current?.click()}
        >
          Attach file
        </button>
        <div className="rich-input__link-row">
          <input
            className="rich-input__link-input"
            type="url"
            placeholder="Add a link"
            value={linkDraft}
            onChange={(event) => setLinkDraft(event.target.value)}
          />
          <button
            className="button button--ghost"
            type="button"
            onClick={() => {
              const trimmed = linkDraft.trim();
              if (!trimmed) {
                return;
              }
              onChange({
                ...value,
                links: [...value.links, trimmed]
              });
              setLinkDraft("");
            }}
          >
            Add link
          </button>
        </div>
      </div>
      <input
        ref={fileRef}
        hidden
        type="file"
        multiple
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          const attachments = await Promise.all(
            files.map(
              (file) =>
                new Promise<AttachmentRecord>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    resolve(createAttachment(file, String(reader.result ?? "")));
                  };
                  reader.onerror = () => reject(reader.error);
                  reader.readAsText(file);
                })
            )
          );
          onChange({
            ...value,
            attachments: [...value.attachments, ...attachments]
          });
          event.target.value = "";
        }}
      />
      {value.links.length > 0 || value.attachments.length > 0 ? (
        <div className="rich-input__chips">
          {value.links.map((link) => (
            <span className="chip" key={link}>
              {link}
            </span>
          ))}
          {value.attachments.map((attachment) => (
            <span className="chip" key={attachment.id}>
              {attachment.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
