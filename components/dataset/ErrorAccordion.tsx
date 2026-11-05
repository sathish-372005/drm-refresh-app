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
          <AccordionTrigger className="flex w-full items-center justify-between rounded-lg bg-rose-50/80 px-2.5 py-1.5 text-xs font-semibold text-rose-700 no-underline transition hover:bg-rose-100/70 hover:text-rose-900 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-950">
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <AlertCircle className="size-3.5 shrink-0 text-rose-600 stroke-[2.2]" />
              <span className="truncate">View failure reason</span>
            </span>
          </AccordionTrigger>

          <AccordionContent className="pt-2 pb-0">
            <div className="w-full space-y-2 overflow-hidden rounded-xl border border-rose-200/90 bg-rose-50/95 p-3 text-left dark:border-rose-900 dark:bg-rose-950/60">
              {/* Error Code */}
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-300">
                  Error Code
                </span>
                <span className="inline-block break-all rounded-md bg-rose-200/60 px-2 py-0.5 font-mono text-xs font-bold text-rose-900 dark:bg-rose-900/70 dark:text-rose-100">
                  {code}
                </span>
              </div>

              {/* Friendly explanation */}
              <div>
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-300">
                  Reason
                </span>
                <p className="break-words text-xs font-medium leading-relaxed text-rose-950 dark:text-rose-100">
                  {message}
                </p>
              </div>

              {/* Troubleshooting Advice */}
              <div className="rounded-lg border border-rose-100/80 bg-white/70 p-2.5 dark:border-rose-900 dark:bg-slate-900/70">
                <div className="flex items-start gap-1.5">
                  <HelpCircle className="size-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <p className="break-words text-[11px] leading-normal text-rose-800 dark:text-rose-200">
                    {advice}
                  </p>
                </div>
              </div>

              {/* Raw JSON Technical Detail (Only if different from code) */}
              {/* {raw && raw !== code && (
                <details className="pt-0.5 text-[10px] text-rose-600/90 dark:text-rose-300">
                  <summary className="cursor-pointer font-medium hover:underline">
                    Raw exception payload
                  </summary>
                  <pre className="mt-1 max-h-28 overflow-y-auto overflow-x-auto whitespace-pre-wrap break-all rounded bg-rose-100/60 p-2 font-mono text-[10px] text-rose-900 dark:bg-rose-900/50 dark:text-rose-100">
                    {raw}
                  </pre>
                </details>
              )} */}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
