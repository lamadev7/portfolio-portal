"use client";

/** Opens the browser print dialog; the document title doubles as the suggested PDF file name. */
export default function PrintButton({ fileName }: { fileName: string }) {
  const print = () => {
    const previous = document.title;
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    document.title = fileName;
    window.addEventListener("afterprint", restore);
    window.print();
  };

  return (
    <button type="button" className="rs-btn rs-btn-p" onClick={print}>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
      </svg>
      Download PDF
    </button>
  );
}
