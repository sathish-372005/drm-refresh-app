"use client";

import React from "react";
import { AlertCircle, HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { parsePowerBiErrorDetails } from "./format-utils";

type Props = {
  error?: string | null;
  className?: string;
  defaultOpen?: boolean;
};

export default function ErrorAccordion({ error, className = "", defaultOpen = false }: Props) {
  if (!error) return null;

  const { code, message, advice, raw } = parsePowerBiErrorDetails(error);

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <Accordion
        type="single"
        collapsible
        defaultValue={defaultOpen ? "error-details" : undefined}
      >
        <AccordionItem value="error-details" className="border-none">
          <AccordionTrigger className="w-full rounded-lg bg-rose-50/80 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100/70 hover:text-rose-900 transition flex items-center justify-between no-underline">
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <AlertCircle className="size-3.5 shrink-0 text-rose-600 stroke-[2.2]" />
              <span className="truncate">View failure reason</span>
            </span>
          </AccordionTrigger>

          <AccordionContent className="pt-2 pb-0">
            <div className="w-full rounded-xl border border-rose-200/90 bg-rose-50/95 p-3 space-y-2 text-left overflow-hidden">
              {/* Error Code */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500 block mb-1">
                  Error Code
                </span>
                <span className="inline-block rounded-md bg-rose-200/60 px-2 py-0.5 font-mono text-xs font-bold text-rose-900 break-all">
                  {code}
                </span>
              </div>

              {/* Friendly explanation */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500 block mb-0.5">
                  Reason
                </span>
                <p className="text-xs font-medium text-rose-950 leading-relaxed break-words">
                  {message}
                </p>
              </div>

              {/* Troubleshooting Advice */}
              <div className="rounded-lg bg-white/70 p-2.5 border border-rose-100/80">
                <div className="flex items-start gap-1.5">
                  <HelpCircle className="size-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-rose-800 leading-normal break-words">
                    {advice}
                  </p>
                </div>
              </div>

              {/* Raw JSON Technical Detail (Only if different from code) */}
              {raw && raw !== code && (
                <details className="text-[10px] text-rose-600/90 pt-0.5">
                  <summary className="cursor-pointer font-medium hover:underline">
                    Raw exception payload
                  </summary>
                  <pre className="mt-1 max-h-28 overflow-y-auto overflow-x-auto rounded bg-rose-100/60 p-2 font-mono text-[10px] text-rose-900 whitespace-pre-wrap break-all">
                    {raw}
                  </pre>
                </details>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

