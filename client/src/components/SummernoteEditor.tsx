import { useEffect, useRef } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jQuery: any;
  }
}

interface SummernoteEditorProps {
  value: string;
  onChange: (content: string) => void;
  height?: number;
  placeholder?: string;
}

export default function SummernoteEditor({
  value,
  onChange,
  height = 480,
  placeholder = "在此輸入文章內容...",
}: SummernoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const $ = window.$;
    if (!$ || !editorRef.current || isInitialized.current) return;

    const $el = $(editorRef.current);

    $el.summernote({
      lang: "zh-TW",
      height,
      placeholder,
      toolbar: [
        ["style", ["style"]],
        ["font", ["bold", "underline", "italic", "strikethrough", "clear"]],
        ["fontsize", ["fontsize"]],
        ["color", ["color"]],
        ["para", ["ul", "ol", "paragraph"]],
        ["table", ["table"]],
        ["insert", ["link", "picture", "hr"]],
        ["view", ["fullscreen", "codeview"]],
      ],
      callbacks: {
        onChange: (contents: string) => {
          onChangeRef.current(contents);
        },
      },
      styleTags: ["p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre"],
    });

    // 設定初始值
    if (value) {
      $el.summernote("code", value);
    }

    isInitialized.current = true;

    return () => {
      if (isInitialized.current) {
        try {
          $el.summernote("destroy");
        } catch (_) {}
        isInitialized.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 當外部 value 被 Gemini 更新時，同步到編輯器
  const prevValueRef = useRef(value);
  useEffect(() => {
    const $ = window.$;
    if (!$ || !editorRef.current || !isInitialized.current) return;
    if (prevValueRef.current === value) return;
    prevValueRef.current = value;
    const $el = $(editorRef.current);
    const current = $el.summernote("code") as string;
    if (current !== value) {
      $el.summernote("code", value);
    }
  }, [value]);

  return (
    <div className="summernote-wrapper w-full h-full">
      <div ref={editorRef} />
    </div>
  );
}
