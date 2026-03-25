import { useState } from "react";

interface AccordionProps {
  title: string;
  children: React.ReactNode;
}

export function Accordion({ title, children }: AccordionProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`accordion ${open ? "open" : ""}`}>
      <button className="accordion-header" onClick={() => setOpen(!open)}>
        <span className="accordion-arrow">{open ? "\u25BC" : "\u25B6"}</span>
        {title}
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
}
